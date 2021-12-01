/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as chalk from 'chalk';
import { UX } from '@salesforce/command';
import { Logger, Messages, SfdxError } from '@salesforce/core';
import { DeployResult, FileResponse, DeployMessage, ComponentStatus } from '@salesforce/source-deploy-retrieve';
import { ResultFormatter, ResultFormatterOptions, toArray } from './resultFormatter';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'push');

export type PushResponse = { pushedSource: Array<Pick<FileResponse, 'filePath' | 'fullName' | 'state' | 'type'>> };

export class PushResultFormatter extends ResultFormatter {
  protected fileResponses: FileResponse[];

  public constructor(logger: Logger, ux: UX, options: ResultFormatterOptions, protected results: DeployResult[]) {
    super(logger, ux, options);
    this.fileResponses = results.some((result) => result.getFileResponses().length)
      ? results.flatMap((result) => result.getFileResponses())
      : [];
    // in a mpd scenario, we could have duplicate results for the files (when the same file is in multiple pkgDirs)
    if (results.length > 1) {
      this.fileResponses = this.fileResponses.filter(
        // only keeps the first result for each file
        (fileResponse, index) => this.fileResponses.findIndex((f) => f.filePath === fileResponse.filePath) === index
      );
    }
  }

  /**
   * Get the JSON output from the DeployResult.
   *
   * @returns a JSON formatted result matching the provided type.
   */
  public getJson(): PushResponse {
    // quiet returns only failures
    const toReturn = this.isQuiet()
      ? this.fileResponses.filter((fileResponse) => fileResponse.state === ComponentStatus.Failed)
      : this.fileResponses;

    return {
      pushedSource: toReturn.map(({ state, fullName, type, filePath }) => ({ state, fullName, type, filePath })),
    };
  }

  /**
   * Displays deploy results in human readable format.  Output can vary based on:
   *
   * 1. Verbose option
   * 3. Checkonly deploy (checkonly=true)
   * 4. Deploy with test results
   * 5. Canceled status
   */
  public display(): void {
    this.displaySuccesses();
    this.displayFailures();

    // Throw a DeployFailed error unless the deployment was successful.
    if (!this.isSuccess()) {
      throw new SfdxError(messages.getMessage('sourcepushFailed'), 'PushFailed');
    }
  }

  protected displaySuccesses(): void {
    if (this.isQuiet()) {
      return;
    }
    if (this.isSuccess() && this.fileResponses?.length) {
      const successes = this.fileResponses.filter((f) => f.state !== 'Failed');
      if (!successes.length) {
        return;
      }
      this.sortFileResponses(successes);
      this.asRelativePaths(successes);

      this.ux.log('');
      this.ux.styledHeader(chalk.blue('Pushed Source'));
      this.ux.table(successes, {
        columns: [
          { key: 'state', label: 'STATE' },
          { key: 'fullName', label: 'FULL NAME' },
          { key: 'type', label: 'TYPE' },
          { key: 'filePath', label: 'PROJECT PATH' },
        ],
      });
    }
  }

  protected displayFailures(): void {
    const failures: Array<FileResponse | DeployMessage> = [];
    const fileResponseFailures: Map<string, string> = new Map<string, string>();

    if (this.fileResponses?.length) {
      const fileResponses: FileResponse[] = [];
      this.fileResponses
        .filter((f) => f.state === 'Failed')
        .map((f: FileResponse & { error: string }) => {
          fileResponses.push(f);
          fileResponseFailures.set(`${f.type}#${f.fullName}`, f.error);
        });
      this.sortFileResponses(fileResponses);
      this.asRelativePaths(fileResponses);
      failures.push(...fileResponses);
    }

    const deployMessages = this.results?.flatMap((result) => toArray(result.response?.details?.componentFailures));
    if (deployMessages.length > failures.length) {
      // if there's additional failures in the API response, find the failure and add it to the output
      deployMessages.map((deployMessage) => {
        if (!fileResponseFailures.has(`${deployMessage.componentType}#${deployMessage.fullName}`)) {
          // duplicate the problem message to the error property for displaying in the table
          failures.push(Object.assign(deployMessage, { error: deployMessage.problem }));
        }
      });
    }
    if (!failures.length) {
      return;
    }
    this.ux.log('');
    this.ux.styledHeader(chalk.red(`Component Failures [${failures.length}]`));
    this.ux.table(failures, {
      columns: [
        { key: 'problemType', label: 'Type' },
        { key: 'fullName', label: 'Name' },
        { key: 'error', label: 'Problem' },
      ],
    });
    this.ux.log('');
  }
}
