/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as chalk from 'chalk';
import { UX } from '@salesforce/command';
import { Logger, Messages, SfdxError } from '@salesforce/core';
import { get, getBoolean, getString, getNumber } from '@salesforce/ts-types';
import { DeployResult } from '@salesforce/source-deploy-retrieve';
import {
  FileResponse,
  MetadataApiDeployStatus,
  RequestStatus,
} from '@salesforce/source-deploy-retrieve/lib/src/client/types';
import { ResultFormatter, ResultFormatterOptions } from './resultFormatter';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'deploy');

export interface DeployCommandResult extends MetadataApiDeployStatus {
  deployedSource: FileResponse[];
  outboundFiles: string[];
  deploys: MetadataApiDeployStatus[];
}

export class DeployResultFormatter extends ResultFormatter {
  protected result: DeployResult;
  protected fileResponses: FileResponse[];

  public constructor(logger: Logger, ux: UX, options: ResultFormatterOptions, result: DeployResult) {
    super(logger, ux, options);
    this.result = result;
    this.fileResponses = result?.getFileResponses ? result.getFileResponses() : [];
  }

  /**
   * Get the JSON output from the DeployResult.
   *
   * @returns a JSON formatted result matching the provided type.
   */
  public getJson(): DeployCommandResult {
    const json = this.getResponse() as DeployCommandResult;
    json.deployedSource = this.fileResponses;
    json.outboundFiles = []; // to match toolbelt version
    json.deploys = [Object.assign({}, this.getResponse())]; // to match toolbelt version

    return json;
  }

  /**
   * Displays deploy results in human format.  Output can vary based on:
   *
   * 1. Verbose option
   * 3. Checkonly deploy (checkonly=true)
   * 4. Deploy with test results
   * 5. Canceled status
   */
  public display(): void {
    // Display check-only, non-verbose success
    if (this.isSuccess() && this.isCheckOnly() && !this.isVerbose()) {
      const componentsDeployed = this.getNumResult('numberComponentsDeployed');
      const testsCompleted = this.getNumResult('numberTestsCompleted');
      const checkOnlySuccessMsg = messages.getMessage('checkOnlySuccess', [componentsDeployed, testsCompleted]);
      this.ux.log(checkOnlySuccessMsg);
      return;
    }
    if (this.hasStatus(RequestStatus.Canceled)) {
      const canceledByName = getString(this.result, 'response.canceledByName', 'unknown');
      throw new SfdxError(messages.getMessage('deployCanceled', [canceledByName]), 'DeployFailed');
    }
    this.displaySuccesses();
    this.displayFailures();
    this.displayTestResults();

    // Throw a DeployFailed error unless the deployment was successful.
    if (!this.isSuccess()) {
      throw new SfdxError(messages.getMessage('deployFailed'), 'DeployFailed');
    }
  }

  protected hasStatus(status: RequestStatus): boolean {
    return getString(this.result, 'response.status') === status;
  }

  // Returns true if the components returned in the server response
  // were mapped to local source in the ComponentSet.
  protected hasMappedComponents(): boolean {
    return getNumber(this.result, 'components.size', 0) > 0;
  }

  // Returns true if the server response contained components.
  protected hasComponents(): boolean {
    const successes = getNumber(this.result, 'response.details.componentSuccesses.length', 0) > 0;
    const failures = getNumber(this.result, 'response.details.componentFailures.length', 0) > 0;
    return successes || failures;
  }

  protected isRunTestsEnabled(): boolean {
    return getBoolean(this.result, 'response.runTestsEnabled', false);
  }

  protected isCheckOnly(): boolean {
    return getBoolean(this.result, 'response.checkOnly', false);
  }

  protected getNumResult(field: string): number {
    return getNumber(this.result, `response.${field}`, 0);
  }

  protected getResponse(): MetadataApiDeployStatus {
    return get(this.result, 'response', {}) as MetadataApiDeployStatus;
  }

  protected displaySuccesses(): void {
    if (this.isSuccess() && this.hasComponents()) {
      this.sortFileResponses(this.fileResponses);
      this.asRelativePaths(this.fileResponses);

      this.ux.log('');
      this.ux.styledHeader(chalk.blue('Deployed Source'));
      this.ux.table(this.fileResponses, {
        columns: [
          { key: 'fullName', label: 'FULL NAME' },
          { key: 'type', label: 'TYPE' },
          { key: 'filePath', label: 'PROJECT PATH' },
        ],
      });
    }
  }

  protected displayFailures(): void {
    if (this.hasStatus(RequestStatus.Failed) && this.hasComponents()) {
      const failures = this.fileResponses.filter((f) => f.state === 'Failed');
      this.sortFileResponses(failures);
      this.asRelativePaths(failures);

      this.ux.log('');
      this.ux.styledHeader(chalk.red(`Component Failures [${failures.length}]`));
      // TODO: do we really need the project path or file path in the table?
      // Seems like we can just provide the full name and devs will know.
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

  protected displayTestResults(): void {
    if (this.isRunTestsEnabled()) {
      this.ux.log('');
      if (this.isVerbose()) {
        this.ux.log('TBD: Show test successes, failures, and code coverage');
      } else {
        this.ux.styledHeader(chalk.blue('Test Results Summary'));
        this.ux.log(`Passing: ${this.getNumResult('numberTestsCompleted')}`);
        this.ux.log(`Failing: ${this.getNumResult('numberTestErrors')}`);
        this.ux.log(`Total: ${this.getNumResult('numberTestsTotal')}`);
        this.ux.log(`Time: ${this.getNumResult('details.runTestResult.totalTime')}`);
      }
    }
  }
}
