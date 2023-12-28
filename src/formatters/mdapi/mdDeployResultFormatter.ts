/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */



import chalk from 'chalk';
import { getNumber } from '@salesforce/ts-types';
import { Messages, SfError } from '@salesforce/core';
import {
  DeployMessage,
  DeployResult,
  Failures,
  MetadataApiDeployStatus,
  RequestStatus,
  Successes,
} from '@salesforce/source-deploy-retrieve';
import { ensureArray } from '@salesforce/kit';
import { Ux } from '@salesforce/sf-plugins-core';
import { CoverageResultsFileInfo, ResultFormatter, ResultFormatterOptions } from '../resultFormatter.js';
import { maybePrintCodeCoverageTable } from '../codeCoverageTable.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url)
const messages = Messages.loadMessages('@salesforce/plugin-source', 'md.deploy');

export type MdDeployResult = {
  coverage?: CoverageResultsFileInfo;
  junit?: string;
} & MetadataApiDeployStatus;

export class MdDeployResultFormatter extends ResultFormatter {
  protected result: DeployResult;

  public constructor(ux: Ux, options: ResultFormatterOptions, result: DeployResult) {
    super(ux, options);
    this.result = result;
  }

  /**
   * Get the JSON output from the DeployResult.
   *
   * @returns a JSON formatted result matching the provided type.
   */
  public getJson(): MdDeployResult {
    // concise omits success messages
    // spread properties prevents modification of the object from impacting tests
    const response = this.getResponse();
    if (this.options.testsRan) {
      response.coverage = this.getCoverageFileInfo();
      response.junit = this.getJunitFileInfo();
    }

    if (this.isConcise()) {
      return {
        ...response,
        details: {
          componentFailures: response.details.componentFailures,
          runTestResult: response.details.runTestResult,
        },
      };
    }
    return response;
  }

  /**
   * @param isReportCommand set to true if the command is deploy:report.  The output is slightly different
   * Displays deploy results in human readable format.  Output can vary based on:
   *
   * 1. Verbose option
   * 3. Checkonly deploy (checkonly=true)
   * 4. Deploy with test results
   * 5. Canceled status
   */
  public display(isReportCommand = false): void {
    if (this.hasStatus(RequestStatus.Canceled)) {
      const canceledByName = this.result.response.canceledByName ?? 'unknown';
      throw new SfError(messages.getMessage('deployCanceled', [canceledByName]), 'DeployFailed');
    }
    if (this.isVerbose()) {
      this.displaySuccesses();
      this.displayFailures();
      this.displayTestResults(isReportCommand);
      this.displayOutputFileLocations();
    } else if (isReportCommand) {
      this.ux.log(`Status: ${this.result.response.status ?? 'unknown'}`);
      const deploys = `Deployed: ${this.getNumResult('numberComponentsDeployed')}/${this.getNumResult(
        'numberComponentsTotal'
      )}`;
      const deployErrors = `Errors: ${this.getNumResult('numberComponentErrors')}`;
      const tests = `Tests Complete: ${this.getNumResult('numberTestsCompleted')}/${this.getNumResult(
        'numberTestsTotal'
      )}`;
      const testErrs = `Errors: ${this.getNumResult('numberTestErrors')}`;
      this.ux.log(`${deploys} ${deployErrors}`);
      this.ux.log(`${tests} ${testErrs}`);
      this.displayOutputFileLocations();
    } else {
      // always show failures
      this.displayFailures();
      this.displayTestResults(isReportCommand);
      this.displayOutputFileLocations();
    }
    // TODO: the toolbelt version of this is returning an SfError shape.  This returns a status=1 and the result (mdapi response) but not the error name, etc
    if (!this.isSuccess()) {
      // Add error message directly on the DeployResult (e.g., a GACK)
      const errMsg = this.getResponse()?.errorMessage ?? '';
      const error = new SfError(messages.getMessage('deployFailed', [errMsg]), 'mdapiDeployFailed');
      error.setData(this.result);
      throw error;
    }
  }

  protected hasStatus(status: RequestStatus): boolean {
    return this.result.response.status === status;
  }

  protected getResponse(): MdDeployResult {
    return this.result.response ?? ({} as MdDeployResult);
  }

  protected displaySuccesses(): void {
    if (this.isSuccess() && this.isVerbose()) {
      const successes = ensureArray(this.getResponse().details.componentSuccesses).sort(mdResponseSorter);

      this.ux.log('');
      this.ux.styledHeader(chalk.blue('Deployed Source'));
      this.ux.table(successes, {
        componentType: { header: 'Type' },
        fileName: { header: 'File' },
        fullName: { header: 'Name' },
        id: { header: 'Id' },
      });
    }
  }

  protected displayFailures(): void {
    if (this.hasStatus(RequestStatus.Failed) || this.hasStatus(RequestStatus.SucceededPartial)) {
      const failures = ensureArray(this.getResponse().details.componentFailures).sort(mdResponseSorter);
      if (failures.length === 0) {
        return;
      }
      this.ux.log('');
      this.ux.styledHeader(chalk.red(`Component Failures [${failures.length}]`));
      this.ux.table(failures, {
        problemType: { header: 'Type' },
        fileName: { header: 'File' },
        fullName: { header: 'Name' },
        problem: { header: 'Problem' },
      });
      this.ux.log('');
    }
  }

  protected getNumResult(field: string): number {
    return getNumber(this.result, `response.${field}`, 0);
  }

  protected displayTestResults(isReportCommand = false): void {
    if (this.result.response.runTestsEnabled) {
      this.ux.log('');
      if (this.isVerbose() || !isReportCommand) {
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
      const failures = ensureArray(this.result.response.details?.runTestResult?.failures);

      const tests = this.sortTestResults(failures);

      this.ux.log('');
      this.ux.styledHeader(chalk.red(`Test Failures [${this.result.response.details.runTestResult?.numFailures}]`));
      this.ux.table(
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        tests.map((test: Failures) => ({
          name: test.name,
          methodName: test.methodName,
          message: test.message,
          stackTrace: test.stackTrace,
        })),
        {
          name: { header: 'Name' },
          methodName: { header: 'Method' },
          message: { header: 'Message' },
          stackTrace: { header: 'Stacktrace' },
        }
      );
    }
  }

  protected verboseTestSuccess(): void {
    const success = ensureArray(this.result?.response?.details?.runTestResult?.successes);
    if (success.length) {
      const tests = this.sortTestResults(success);
      this.ux.log('');
      this.ux.styledHeader(chalk.green(`Test Success [${success.length}]`));
      this.ux.table(
        tests.map((test: Successes) => ({ name: test.name, methodName: test.methodName })),
        {
          name: { header: 'Name' },
          methodName: { header: 'Method' },
        }
      );
    }
    maybePrintCodeCoverageTable(this.result.response.details?.runTestResult?.codeCoverage ?? [], this.ux);
  }

  protected verboseTestTime(): void {
    if (
      this.result.response?.details?.runTestResult?.successes ??
      this.result?.response?.details?.runTestResult?.failures
    ) {
      this.ux.log('');
      this.ux.log(`Total Test Time:  ${this.result?.response?.details?.runTestResult?.totalTime}`);
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
  return i.componentType ?? '' > (j.componentType ?? '') ? 1 : -1;
};
