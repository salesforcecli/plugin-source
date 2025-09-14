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

export type RetrieveResultFormatterOptions = {
  retrieveTargetDir: string;
  zipFileName?: string;
  unzip?: boolean;
} & ResultFormatterOptions;

export type RetrieveCommandAsyncResult = {
  done: boolean;
  id: string;
  state: RequestStatus | 'Queued';
  status: RequestStatus | 'Queued';
  timedOut: boolean;
};

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
        const extractPath = join(this.options.retrieveTargetDir, parse(this.options.zipFileName ?? '').name);
        this.ux.log(`Extracted ${this.options.zipFileName ?? '<missing zipFileName>'} to: ${extractPath}`);
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
