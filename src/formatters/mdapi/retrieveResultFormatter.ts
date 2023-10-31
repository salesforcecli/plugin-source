/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { join, parse } from 'node:path';
import chalk from 'chalk';
import { getNumber } from '@salesforce/ts-types';
import {
  RetrieveResult,
  MetadataApiRetrieveStatus,
  RequestStatus,
  FileProperties,
} from '@salesforce/source-deploy-retrieve';
import { ensureArray } from '@salesforce/kit';
import { Ux } from '@salesforce/sf-plugins-core';
import { RetrieveFormatter } from '../retrieveFormatter.js';
import { ResultFormatterOptions } from '../resultFormatter.js';

export type RetrieveCommandResult = Omit<MetadataApiRetrieveStatus, 'zipFile'> & { zipFilePath: string };

export interface RetrieveResultFormatterOptions extends ResultFormatterOptions {
  retrieveTargetDir: string;
  zipFileName: string;
  unzip?: boolean;
}

export interface RetrieveCommandAsyncResult {
  done: boolean;
  id: string;
  state: RequestStatus | 'Queued';
  status: RequestStatus | 'Queued';
  timedOut: boolean;
}

export class RetrieveResultFormatter extends RetrieveFormatter {
  protected zipFilePath: string;

  public constructor(ux: Ux, public options: RetrieveResultFormatterOptions, result: RetrieveResult) {
    super(ux, options, result);
    this.options.zipFileName ??= 'unpackaged.zip';
    this.zipFilePath = join(options.retrieveTargetDir, this.options.zipFileName);
  }

  /**
   * Get the JSON output from the RetrieveResult.
   *
   * @returns RetrieveCommandResult
   */
  public getJson(): RetrieveCommandResult {
    return { ...this.result, zipFilePath: this.zipFilePath };
  }

  /**
   * Displays retrieve results in human format.
   */
  public display(): void {
    if (this.hasStatus(RequestStatus.InProgress)) {
      // The command timed out
      const commandWaitTime = getNumber(this.options, 'waitTime', 1440);
      this.ux.log(this.messages.getMessage('retrieveTimeout', [commandWaitTime]));
      return;
    }

    if (this.isSuccess()) {
      this.ux.log(`Wrote retrieve zip to ${this.zipFilePath}`);
      if (this.options.unzip) {
        const extractPath = join(this.options.retrieveTargetDir, parse(this.options.zipFileName).name);
        this.ux.log(`Extracted ${this.options.zipFileName} to: ${extractPath}`);
      }
      if (this.options.verbose) {
        const retrievedFiles = ensureArray(this.result.fileProperties);
        if (retrievedFiles?.length) {
          this.displaySuccesses(retrievedFiles);
        }
      }
      if (this.warnings.length) {
        this.displayWarnings();
      }
    } else {
      this.displayErrors();
    }
  }

  private displaySuccesses(retrievedFiles: FileProperties[]): void {
    this.sortFileProperties(retrievedFiles);

    this.ux.log('');
    this.ux.styledHeader(chalk.blue(`Components Retrieved [${retrievedFiles.length}]`));
    this.ux.table(retrievedFiles, {
      type: { header: 'TYPE' },
      fileName: { header: 'FILE' },
      fullName: { header: 'NAME' },
      id: { header: 'ID' },
    });
  }
}
