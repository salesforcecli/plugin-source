/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as chalk from 'chalk';
import { UX } from '@salesforce/command';
import { Logger, Messages, SfdxError } from '@salesforce/core';
import { asString, get, getBoolean, getNumber, getString } from '@salesforce/ts-types';
import {
  DeployMessage,
  DeployResult,
  FileResponse,
  MetadataApiDeployStatus,
  RequestStatus,
} from '@salesforce/source-deploy-retrieve';
import { prepCoverageForDisplay } from '../../src/coverageUtils';
import { ResultFormatter, ResultFormatterOptions, toArray } from './resultFormatter';
import { MdDeployResult } from './mdapi/mdDeployResultFormatter';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'deploy');

export interface DeployCommandResult extends MdDeployResult {
  deletedSource?: FileResponse[];
  deployedSource: FileResponse[];
  outboundFiles: string[];
  deploys: MetadataApiDeployStatus[];
  deletes?: MetadataApiDeployStatus[];
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
    json.coverage = this.getCoverageFileInfo();
    json.junit = this.getJunitFileInfo();

    return json;
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
    this.displayDeletions();
    this.displayFailures();
    this.displayTestResults();
    this.displayOutputFileLocations();

    // Throw a DeployFailed error unless the deployment was successful.
    if (!this.isSuccess()) {
      throw new SfdxError(messages.getMessage('deployFailed'), 'DeployFailed');
    }
  }

  protected hasStatus(status: RequestStatus): boolean {
    return getString(this.result, 'response.status') === status;
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
    if (this.isSuccess() && this.fileResponses?.length) {
      const successes = this.fileResponses.filter((f) => !['Failed', 'Deleted'].includes(f.state));
      if (!successes.length) {
        return;
      }
      this.sortFileResponses(successes);
      this.asRelativePaths(successes);

      this.ux.log('');
      this.ux.styledHeader(chalk.blue('Deployed Source'));
      this.ux.table(successes, {
        columns: [
          { key: 'fullName', label: 'FULL NAME' },
          { key: 'type', label: 'TYPE' },
          { key: 'filePath', label: 'PROJECT PATH' },
        ],
      });
    }
  }

  protected displayDeletions(): void {
    const deletions = this.fileResponses.filter((f) => f.state === 'Deleted');
    if (!deletions.length) {
      return;
    }
    this.sortFileResponses(deletions);
    this.asRelativePaths(deletions);

    this.ux.log('');
    this.ux.styledHeader(chalk.blue('Deleted Source'));
    this.ux.table(deletions, {
      columns: [
        { key: 'fullName', label: 'FULL NAME' },
        { key: 'type', label: 'TYPE' },
        { key: 'filePath', label: 'PROJECT PATH' },
      ],
    });
  }

  protected displayFailures(): void {
    if (this.hasStatus(RequestStatus.Failed) || this.hasStatus(RequestStatus.SucceededPartial)) {
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

      const deployMessages = toArray(this.result?.response?.details?.componentFailures);
      if (deployMessages.length > failures.length) {
        // if there's additional failures in the API response, find the failure and add it to the output
        deployMessages.map((deployMessage) => {
          if (!fileResponseFailures.has(`${deployMessage.componentType}#${deployMessage.fullName}`)) {
            // duplicate the problem message to the error property for displaying in the table
            failures.push(Object.assign(deployMessage, { error: deployMessage.problem }));
          }
        });
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

  protected displayTestResults(): void {
    if (this.isRunTestsEnabled()) {
      this.ux.log('');
      if (this.isVerbose()) {
        this.verboseTestFailures();
        this.verboseTestSuccess();
        this.verboseTestTime();
      } else {
        this.ux.styledHeader(chalk.blue('Test Results Summary'));
        this.ux.log(`Passing: ${this.getNumResult('numberTestsCompleted')}`);
        this.ux.log(`Failing: ${this.getNumResult('numberTestErrors')}`);
        this.ux.log(`Total: ${this.getNumResult('numberTestsTotal')}`);
        this.ux.log(`Time: ${this.getNumResult('details.runTestResult.totalTime')}`);
      }
    }
  }

  protected verboseTestFailures(): void {
    if (this.result?.response?.numberTestErrors) {
      const failures = toArray(this.result.response.details?.runTestResult?.failures);

      const tests = this.sortTestResults(failures);

      this.ux.log('');
      this.ux.styledHeader(
        chalk.red(`Test Failures [${asString(this.result.response.details.runTestResult?.numFailures)}]`)
      );
      this.ux.table(tests, {
        columns: [
          { key: 'name', label: 'Name' },
          { key: 'methodName', label: 'Method' },
          { key: 'message', label: 'Message' },
          { key: 'stackTrace', label: 'Stacktrace' },
        ],
      });
    }
  }

  protected verboseTestSuccess(): void {
    const success = toArray(this.result?.response?.details?.runTestResult?.successes);
    if (success.length) {
      const tests = this.sortTestResults(success);
      this.ux.log('');
      this.ux.styledHeader(chalk.green(`Test Success [${success.length}]`));
      this.ux.table(tests, {
        columns: [
          { key: 'name', label: 'Name' },
          { key: 'methodName', label: 'Method' },
        ],
      });
    }
    const codeCoverage = toArray(this.result?.response?.details?.runTestResult?.codeCoverage);

    if (codeCoverage.length) {
      const coverage = prepCoverageForDisplay(codeCoverage);

      this.ux.log('');
      this.ux.styledHeader(chalk.blue('Apex Code Coverage'));
      this.ux.table(coverage, {
        columns: [
          { key: 'name', label: 'Name' },
          {
            key: 'numLocations',
            label: '% Covered',
          },
          {
            key: 'lineNotCovered',
            label: 'Uncovered Lines',
          },
        ],
      });
    }
  }

  protected verboseTestTime(): void {
    if (
      this.result.response?.details?.runTestResult?.successes ||
      this.result?.response?.details?.runTestResult?.failures
    ) {
      this.ux.log('');
      this.ux.log(`Total Test Time:  ${this.result?.response?.details?.runTestResult?.totalTime}`);
    }
  }
}
