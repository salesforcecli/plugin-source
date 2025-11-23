/*
 * Copyright 2025, Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/* eslint-disable class-methods-use-this */

import path from 'node:path';
import fs from 'node:fs';
import { Failures, FileProperties, FileResponse, Successes } from '@salesforce/source-deploy-retrieve';
import { getNumber } from '@salesforce/ts-types';
import chalk from 'chalk';
import { CoverageReporterOptions, DefaultReportOptions } from '@salesforce/apex-node';
import { Ux } from '@salesforce/sf-plugins-core';

export type ResultFormatterOptions = {
  verbose?: boolean;
  quiet?: boolean;
  waitTime?: number;
  concise?: boolean;
  username?: string;
  coverageOptions?: CoverageReporterOptions;
  junitTestResults?: boolean;
  resultsDir?: string;
  testsRan?: boolean;
}

export type CoverageResultsFileInfo = Record<keyof Partial<typeof DefaultReportOptions>, string>;

export abstract class ResultFormatter {
  protected constructor(public ux: Ux, public options: ResultFormatterOptions = {}) {}

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
        // filepaths won't be undefined here
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        return i.filePath > j.filePath ? 1 : -1;
      }
      return i.type > j.type ? 1 : -1;
    });
  }

  // Sort by type > fileName > fullName
  // eslint-disable-next-line class-methods-use-this
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
    if (this.options.testsRan && this.options.verbose) {
      this.ux.log();
      this.ux.styledHeader(chalk.blue('Coverage or Junit Result Report Locations'));
    }
    if (
      this.options.testsRan &&
      this.options.coverageOptions?.reportFormats &&
      this.options.coverageOptions?.reportFormats?.length > 0
    ) {
      this.ux.log(
        `Code Coverage formats, [${this.options.coverageOptions.reportFormats.join(',')}], written to ${path.join(
          this.options.resultsDir ?? '',
          'coverage'
        )}`
      );
    }
    if (this.options.testsRan && this.options.junitTestResults) {
      this.ux.log(`Junit results written to ${path.join(this.options.resultsDir ?? '', 'junit', 'junit.xml')}`);
    }
  }

  protected getCoverageFileInfo(): CoverageResultsFileInfo | undefined {
    const formatters = this.options.coverageOptions?.reportFormats;
    if (!formatters) {
      return undefined;
    }
    const reportOptions = this.options.coverageOptions?.reportOptions ?? DefaultReportOptions;
    return Object.fromEntries(
      formatters.map((formatter) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
        const selectedReportOptions = reportOptions[formatter];
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const filename = selectedReportOptions['file'] as string;
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const subdir = selectedReportOptions['subdir'] as string;
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        return [formatter, path.join(...[this.options.resultsDir, subdir, filename].filter((part) => part))];
      })
    ) as CoverageResultsFileInfo;
  }

  protected getJunitFileInfo(): string | undefined {
    if (!this.options.resultsDir || !fs.statSync(this.options.resultsDir, { throwIfNoEntry: false })) {
      return undefined;
    }
    if (this.options.junitTestResults) {
      return path.join(this.options.resultsDir, 'junit', 'junit.xml');
    }
    return undefined;
  }

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  public abstract getJson(): any;
  public abstract display(): void;
}
