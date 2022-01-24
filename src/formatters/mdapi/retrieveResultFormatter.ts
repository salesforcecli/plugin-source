/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { join, parse } from 'path';
import { blue, yellow } from 'chalk';
import { UX } from '@salesforce/command';
import { Logger, Messages, SfdxError } from '@salesforce/core';
import { get, getNumber } from '@salesforce/ts-types';
import {
  RetrieveResult,
  MetadataApiRetrieveStatus,
  RequestStatus,
  RetrieveMessage,
  FileProperties,
} from '@salesforce/source-deploy-retrieve';
import { ResultFormatter, ResultFormatterOptions, toArray } from '../resultFormatter';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'retrieve');

export type RetrieveCommandResult = Omit<MetadataApiRetrieveStatus, 'zipFile'> & { zipFilePath: string };

export interface RetrieveResultFormatterOptions extends ResultFormatterOptions {
  retrieveTargetDir: string;
  zipFileName?: string;
  unzip?: boolean;
}

export interface RetrieveCommandAsyncResult {
  done: boolean;
  id: string;
  state: RequestStatus | 'Queued';
  status: RequestStatus | 'Queued';
  timedOut: boolean;
}

export class RetrieveResultFormatter extends ResultFormatter {
  protected result: RetrieveCommandResult;
  protected warnings: RetrieveMessage[];

  public constructor(logger: Logger, ux: UX, public options: RetrieveResultFormatterOptions, result: RetrieveResult) {
    super(logger, ux, options);
    // zipFile can become massive and unwieldy with JSON parsing/terminal output and, isn't useful
    delete result.response.zipFile;
    this.options.zipFileName ??= 'unpackaged.zip';
    const zipFilePath = join(options.retrieveTargetDir, options.zipFileName);
    this.result = Object.assign({}, result.response, { zipFilePath });

    // grab warnings
    this.warnings = toArray(result?.response?.messages ?? []);
  }

  /**
   * Get the JSON output from the RetrieveResult.
   *
   * @returns RetrieveCommandResult
   */
  public getJson(): RetrieveCommandResult {
    return this.result;
  }

  /**
   * Displays retrieve results in human format.
   */
  public display(): void {
    if (this.hasStatus(RequestStatus.InProgress)) {
      // The command timed out
      const commandWaitTime = getNumber(this.options, 'waitTime', 1440);
      this.ux.log(messages.getMessage('retrieveTimeout', [commandWaitTime]));
      return;
    }

    if (this.isSuccess()) {
      this.ux.log(`Wrote retrieve zip to ${this.result.zipFilePath}`);
      if (this.options.unzip) {
        const extractPath = join(this.options.retrieveTargetDir, parse(this.options.zipFileName).name);
        this.ux.log(`Extracted ${this.options.zipFileName} to: ${extractPath}`);
      }
      if (this.options.verbose) {
        const retrievedFiles = toArray(this.result.fileProperties);
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

  protected hasStatus(status: RequestStatus): boolean {
    return this.result?.status === status;
  }

  private displayWarnings(): void {
    this.ux.styledHeader(yellow(messages.getMessage('retrievedSourceWarningsHeader')));
    const columns = [
      { key: 'fileName', label: 'FILE NAME' },
      { key: 'problem', label: 'PROBLEM' },
    ];
    this.ux.table(this.warnings, { columns });
    this.ux.log();
  }

  private displaySuccesses(retrievedFiles: FileProperties[]): void {
    this.sortFileProperties(retrievedFiles);

    this.ux.log('');
    this.ux.styledHeader(blue(`Components Retrieved [${retrievedFiles.length}]`));
    const columns = [
      { key: 'type', label: 'TYPE' },
      { key: 'fileName', label: 'FILE' },
      { key: 'fullName', label: 'NAME' },
      { key: 'id', label: 'ID' },
    ];
    this.ux.table(retrievedFiles, { columns });
  }

  private displayErrors(): void {
    // an invalid packagename retrieval will end up with a message in the `errorMessage` entry
    const errorMessage = get(this.result, 'errorMessage') as string;
    if (errorMessage) {
      throw new SfdxError(errorMessage);
    }
    const unknownMsg: RetrieveMessage[] = [{ fileName: 'unknown', problem: 'unknown' }];
    const responseMsgs = get(this.result, 'messages', unknownMsg) as RetrieveMessage | RetrieveMessage[];
    const errMsgs = toArray(responseMsgs);
    const errMsgsForDisplay = errMsgs.reduce<string>((p, c) => `${p}\n${c.fileName}: ${c.problem}`, '');
    this.ux.log(`Retrieve Failed due to: ${errMsgsForDisplay}`);
  }
}
