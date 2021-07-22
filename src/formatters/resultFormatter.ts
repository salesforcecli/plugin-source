/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import { UX } from '@salesforce/command';
import { Logger } from '@salesforce/core';
import { FileResponse } from '@salesforce/source-deploy-retrieve';
import { getBoolean, getNumber } from '@salesforce/ts-types';
import { Failures, Successes } from '@salesforce/source-deploy-retrieve/src/client/types';

export interface ResultFormatterOptions {
  verbose?: boolean;
  waitTime?: number;
}

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
    return getNumber(process, 'exitCode', 0) === 0;
  }

  public isVerbose(): boolean {
    return getBoolean(this.options, 'verbose', false);
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

  protected sortTestResults(results: Failures[] | Successes[]): Failures[] | Successes[] {
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

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  public abstract getJson(): any;
  public abstract display(): void;
}
