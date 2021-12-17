/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as chalk from 'chalk';
import { UX } from '@salesforce/command';
import { Logger, Messages, SfdxError } from '@salesforce/core';
import {
  DeployMessage,
  DeployResult,
  MetadataApiDeployStatus,
  RequestStatus,
} from '@salesforce/source-deploy-retrieve';
import { ResultFormatter, ResultFormatterOptions, toArray } from './resultFormatter';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'md.deploy');

export type MdDeployResult = MetadataApiDeployStatus;

export class MdDeployResultFormatter extends ResultFormatter {
  protected result: DeployResult;

  public constructor(logger: Logger, ux: UX, options: ResultFormatterOptions, result: DeployResult) {
    super(logger, ux, options);
    this.result = result;
  }

  /**
   * Get the JSON output from the DeployResult.
   *
   * @returns a JSON formatted result matching the provided type.
   */
  public getJson(): MdDeployResult {
    return this.getResponse();
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
    if (this.hasStatus(RequestStatus.Canceled)) {
      const canceledByName = this.result.response.canceledByName ?? 'unknown';
      throw new SfdxError(messages.getMessage('deployCanceled', [canceledByName]), 'DeployFailed');
    }
    this.displaySuccesses();
    this.displayFailures();

    // TODO: the toolbelt version of this is returning an SfdxError shape.  This returns a status=1 and the result (mdapi response) but not the error name, etc
    if (!this.isSuccess()) {
      const error = new SfdxError(messages.getMessage('deployFailed'), 'mdapiDeployFailed');
      error.setData(this.result);
      throw error;
    }
  }

  protected hasStatus(status: RequestStatus): boolean {
    return this.result.response.status === status;
  }

  protected getResponse(): MetadataApiDeployStatus {
    return this.result.response ?? ({} as MetadataApiDeployStatus);
  }

  protected displaySuccesses(): void {
    if (this.isSuccess()) {
      const successes = toArray(this.getResponse().details.componentSuccesses).sort(mdResponseSorter);

      this.ux.log('');
      this.ux.styledHeader(chalk.blue('Deployed Source'));
      this.ux.table(successes, {
        columns: [
          { key: 'componentType', label: 'Type' },
          { key: 'fileName', label: 'File' },
          { key: 'fullName', label: 'Name' },
          { key: 'id', label: 'Id' },
        ],
      });
    }
  }

  protected displayFailures(): void {
    if (this.hasStatus(RequestStatus.Failed) || this.hasStatus(RequestStatus.SucceededPartial)) {
      const failures = toArray(this.getResponse().details.componentFailures).sort(mdResponseSorter);

      this.ux.log('');
      this.ux.styledHeader(chalk.red(`Component Failures [${failures.length}]`));
      this.ux.table(failures, {
        columns: [
          { key: 'problemType', label: 'Type' },
          { key: 'fileName', label: 'File' },
          { key: 'fullName', label: 'Name' },
          { key: 'problem', label: 'Problem' },
        ],
      });
      this.ux.log('');
    }
  }
}

const mdResponseSorter = (i: DeployMessage, j: DeployMessage): number => {
  if (i.componentType === j.componentType) {
    if (i.fileName === j.fileName) {
      return i.fullName > j.fullName ? 1 : -1;
    }
    return i.fileName > j.fileName ? 1 : -1;
  }
  return i.componentType > j.componentType ? 1 : -1;
};
