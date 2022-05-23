/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import { UX } from '@salesforce/command';
import { Logger } from '@salesforce/core';
import { Failures, FileProperties, FileResponse, Successes } from '@salesforce/source-deploy-retrieve';
import { getNumber } from '@salesforce/ts-types';
import * as chalk from 'chalk';
import { CoverageReporterOptions, DefaultReportOptions } from '@salesforce/apex-node';

export interface ResultFormatterOptions {
  verbose?: boolean;
  quiet?: boolean;
  waitTime?: number;
  concise?: boolean;
  username?: string;
  coverageOptions?: CoverageReporterOptions;
  junitTestResults?: boolean;
  resultsDir?: string;
}

export function toArray<T>(entryOrArray: T | T[] | undefined): T[] {
  if (entryOrArray) {
    return Array.isArray(entryOrArray) ? entryOrArray : [entryOrArray];
  }
  return [];
}

export type CoverageResultsFileInfo = Record<keyof Partial<typeof DefaultReportOptions>, string>;

export abstract class ResultFormatter {
  public logger: Logger;
  public ux: UX;
  public options: ResultFormatterOptions;

  public constructor(logger: Logger, ux: UX, options: ResultFormatterOptions = {}) {
    this.logger = logger;
    this.ux = ux;
    this.options = options;
  }

  // Command success is determined by the command so it can set the
  // exit code on the process, which is done before formatting.
  public isSuccess(): boolean {
    return [0, 69].includes(getNumber(process, 'exitCode', 0));
  }

  public isVerbose(): boolean {
    return this.options.verbose ?? false;
  }

  public isQuiet(): boolean {
    return this.options.quiet ?? false;
  }

  public isConcise(): boolean {
    return this.options.concise ?? false;
  }

  // Sort by type > filePath > fullName
  protected sortFileResponses(fileResponses: FileResponse[]): void {
    fileResponses.sort((i, j) => {
      if (i.type === j.type) {
        if (i.filePath === j.filePath) {
          return i.fullName > j.fullName ? 1 : -1;
        }
        return i.filePath > j.filePath ? 1 : -1;
      }
      return i.type > j.type ? 1 : -1;
    });
  }

  // Sort by type > fileName > fullName
  protected sortFileProperties(fileProperties: FileProperties[]): void {
    fileProperties.sort((i, j) => {
      if (i.type === j.type) {
        if (i.fileName === j.fileName) {
          return i.fullName > j.fullName ? 1 : -1;
        }
        return i.fileName > j.fileName ? 1 : -1;
      }
      return i.type > j.type ? 1 : -1;
    });
  }

  protected sortTestResults(results: Failures[] | Successes[] = []): Failures[] | Successes[] {
    return results.sort((a: Successes, b: Successes) => {
      if (a.methodName === b.methodName) {
        return a.name > b.name ? 1 : -1;
      }
      return a.methodName > b.methodName ? 1 : -1;
    });
  }

  // Convert absolute paths to relative for better table output.
  protected asRelativePaths(fileResponses: FileResponse[]): void {
    fileResponses.forEach((file) => {
      if (file.filePath) {
        file.filePath = path.relative(process.cwd(), file.filePath);
      }
    });
  }

  protected displayOutputFileLocations(): void {
    if (this.options.verbose && (this.options.coverageOptions?.reportFormats || this.options.junitTestResults)) {
      this.ux.log();
      this.ux.styledHeader(chalk.blue('Coverage or Junit Result Report Locations'));
    }
    if (this.options.coverageOptions?.reportFormats?.length > 0) {
      this.ux.log(
        `Code Coverage formats, [${this.options.coverageOptions.reportFormats.join(',')}], written to ${path.join(
          this.options.resultsDir,
          'coverage'
        )}`
      );
    }
    if (this.options.junitTestResults) {
      this.ux.log(`Junit results written to ${path.join(this.options.resultsDir, 'junit', 'junit.xml')}`);
    }
  }

  protected getCoverageFileInfo(): CoverageResultsFileInfo {
    /* eslint-disable @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment */
    const formatters = this.options.coverageOptions?.reportFormats;
    if (!formatters) {
      return undefined;
    }
    const reportOptions = this.options.coverageOptions?.reportOptions || DefaultReportOptions;
    return Object.fromEntries(
      formatters.map((formatter) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
        const selectedReportOptions = reportOptions[formatter];
        const filename = selectedReportOptions['file'] as string;
        const subdir = selectedReportOptions['subdir'] as string;
        return [formatter, path.join(...[this.options.resultsDir, subdir, filename].filter((part) => part))];
      })
    ) as CoverageResultsFileInfo;
    /* eslint-enable @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment */
  }

  protected getJunitFileInfo(): string | undefined {
    if (this.options.junitTestResults) {
      return path.join(this.options.resultsDir, 'junit', 'junit.xml');
    }
    return undefined;
  }

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  public abstract getJson(): any;
  public abstract display(): void;
}
