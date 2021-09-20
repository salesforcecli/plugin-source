/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as chalk from 'chalk';
import { UX } from '@salesforce/command';
import { Logger, Messages, SfdxError } from '@salesforce/core';
import { get, getBoolean, getString, getNumber, asString } from '@salesforce/ts-types';
import {
  DeployResult,
  CodeCoverage,
  FileResponse,
  MetadataApiDeployStatus,
  RequestStatus,
  DeployMessage,
} from '@salesforce/source-deploy-retrieve';
import { ResultFormatter, ResultFormatterOptions, toArray } from './resultFormatter';

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
      const successes = this.fileResponses.filter((f) => f.state !== 'Failed');
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

  protected displayFailures(): void {
    if (this.hasStatus(RequestStatus.Failed)) {
      const failures: Array<FileResponse | DeployMessage> = [];

      if (this.fileResponses?.length) {
        const fileResponses = this.fileResponses.filter((f) => f.state === 'Failed');
        this.sortFileResponses(fileResponses);
        this.asRelativePaths(fileResponses);
        failures.push(...fileResponses);
      }

      const deployMessages = toArray(this.result?.response?.details?.componentFailures);
      if (deployMessages.length > failures.length) {
        // if there's additional failures in the API response, find the failure and add it to the output
        deployMessages.map((deployMessage) => {
          if (
            !failures.find(
              (fail: FileResponse & { error: string }) =>
                // if either of their error messages contains the other, and they're the same type and fullName, consider them the same error
                (fail.error.includes(deployMessage.problem) || deployMessage.problem.includes(fail.error)) &&
                fail.type === deployMessage.componentType &&
                fail.fullName === deployMessage.fullName
            )
          ) {
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
      const coverage = codeCoverage.sort((a, b) => {
        return a.name.toUpperCase() > b.name.toUpperCase() ? 1 : -1;
      });

      this.ux.log('');
      this.ux.styledHeader(chalk.blue('Apex Code Coverage'));

      coverage.map((cov: CodeCoverage & { lineNotCovered: string }) => {
        const numLocationsNum = parseInt(cov.numLocations, 10);
        const numLocationsNotCovered: number = parseInt(cov.numLocationsNotCovered, 10);
        const color = numLocationsNotCovered > 0 ? chalk.red : chalk.green;

        let pctCovered = 100;
        const coverageDecimal: number = parseFloat(
          ((numLocationsNum - numLocationsNotCovered) / numLocationsNum).toFixed(2)
        );
        if (numLocationsNum > 0) {
          pctCovered = coverageDecimal * 100;
        }
        cov.numLocations = color(`${pctCovered}%`);

        if (!cov.locationsNotCovered) {
          cov.lineNotCovered = '';
        }
        const locations = toArray(cov.locationsNotCovered);
        cov.lineNotCovered = locations.map((location) => location.line).join(',');
      });

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
