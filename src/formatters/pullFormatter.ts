/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { blue, yellow } from 'chalk';
import { UX } from '@salesforce/command';
import { Logger, Messages, SfdxError } from '@salesforce/core';
import { get, getString, getNumber } from '@salesforce/ts-types';
import {
  RetrieveResult,
  ComponentStatus,
  FileResponse,
  RequestStatus,
  RetrieveMessage,
} from '@salesforce/source-deploy-retrieve';
import { ResultFormatter, ResultFormatterOptions, toArray } from './resultFormatter';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'pull');

export type PullResponse = Pick<FileResponse, 'filePath' | 'fullName' | 'state' | 'type'>;

export class PullResultFormatter extends ResultFormatter {
  protected result: RetrieveResult;
  protected fileResponses: FileResponse[];
  protected warnings: RetrieveMessage[];

  public constructor(
    logger: Logger,
    ux: UX,
    options: ResultFormatterOptions,
    retrieveResult: RetrieveResult,
    deleteResult: FileResponse[] = []
  ) {
    super(logger, ux, options);
    this.result = retrieveResult;
    this.fileResponses = (retrieveResult?.getFileResponses ? retrieveResult.getFileResponses() : []).concat(
      deleteResult
    );
    const warnMessages = retrieveResult?.response?.messages ?? ([] as RetrieveMessage | RetrieveMessage[]);
    this.warnings = toArray(warnMessages);
    if (this.result?.response?.zipFile) {
      // zipFile can become massive and unwieldy with JSON parsing/terminal output and, isn't useful
      delete this.result.response.zipFile;
    }
  }

  /**
   * Get the JSON output from the PullCommandResult.
   *
   * @returns RetrieveCommandResult
   */
  public getJson(): PullResponse[] {
    return this.fileResponses.map(({ state, fullName, type, filePath }) => ({ state, fullName, type, filePath }));
  }

  /**
   * Displays retrieve results in human format.
   */
  public display(): void {
    if (this.hasStatus(RequestStatus.InProgress)) {
      const commandWaitTime = getNumber(this.options, 'waitTime', 33);
      this.ux.log(messages.getMessage('retrieveTimeout', [commandWaitTime]));
      return;
    }

    if (this.isSuccess()) {
      this.ux.styledHeader(blue(messages.getMessage('retrievedSourceHeader')));
      const retrievedFiles = this.fileResponses.filter((fr) => fr.state !== ComponentStatus.Failed);
      if (retrievedFiles?.length) {
        this.displaySuccesses(retrievedFiles);
      } else {
        this.ux.log(messages.getMessage('NoResultsFound'));
      }
      if (this.warnings.length) {
        this.displayWarnings();
      }
    } else {
      this.displayErrors();
    }
  }

  protected hasStatus(status: RequestStatus): boolean {
    return getString(this.result, 'response.status') === status;
  }

  protected hasComponents(): boolean {
    return getNumber(this.result, 'components.size', 0) === 0;
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

  private displaySuccesses(retrievedFiles: FileResponse[]): void {
    this.sortFileResponses(retrievedFiles);
    this.asRelativePaths(retrievedFiles);
    this.ux.table(retrievedFiles, {
      columns: [
        { label: 'STATE', key: 'state' },
        { label: 'FULL NAME', key: 'fullName' },
        { label: 'TYPE', key: 'type' },
        { label: 'PROJECT PATH', key: 'filePath' },
      ],
    });
  }

  private displayErrors(): void {
    // an invalid packagename retrieval will end up with a message in the `errorMessage` entry
    if (!this.result) {
      return;
    }
    const errorMessage = getString(this.result.response, 'errorMessage');
    if (errorMessage) {
      throw new SfdxError(errorMessage);
    }
    const unknownMsg: RetrieveMessage[] = [{ fileName: 'unknown', problem: 'unknown' }];
    const responseMsgs = get(this.result, 'response.messages', unknownMsg) as RetrieveMessage | RetrieveMessage[];
    const errMsgs = toArray(responseMsgs);
    const errMsgsForDisplay = errMsgs.reduce<string>((p, c) => `${p}\n${c.fileName}: ${c.problem}`, '');
    this.ux.log(`Retrieve Failed due to: ${errMsgsForDisplay}`);
  }
}
