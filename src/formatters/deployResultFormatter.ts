/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import path from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import chalk from 'chalk';

import { Messages, SfError } from '@salesforce/core';
import { ensureArray } from '@salesforce/kit';
import { asString, get, getBoolean, getNumber, getString } from '@salesforce/ts-types';
import {
  DeployMessage,
  DeployResult,
  Failures,
  FileResponse,
  FileResponseFailure,
  MetadataApiDeployStatus,
  RequestStatus,
  Successes,
} from '@salesforce/source-deploy-retrieve';
import { Ux } from '@salesforce/sf-plugins-core';
import { ComponentStatus } from '@salesforce/source-deploy-retrieve/lib/src/client/types.js';
import { ResultFormatter, ResultFormatterOptions } from './resultFormatter.js';
import { MdDeployResult } from './mdapi/mdDeployResultFormatter.js';
import { maybePrintCodeCoverageTable } from './codeCoverageTable.js';

Messages.importMessagesDirectory(dirname(fileURLToPath(import.meta.url)));
const messages = Messages.loadMessages('@salesforce/plugin-source', 'deploy');

export type DeployCommandResult = {
  deletedSource?: FileResponse[];
  deployedSource: FileResponse[];
  outboundFiles: string[];
  deploys: MetadataApiDeployStatus[];
  deletes?: MetadataApiDeployStatus[];
  replacements?: Record<string, string[]>;
} & MdDeployResult;

export class DeployResultFormatter extends ResultFormatter {
  protected result: DeployResult;
  protected fileResponses: FileResponse[];

  public constructor(ux: Ux, options: ResultFormatterOptions, result: DeployResult) {
    super(ux, options);
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
    if (this.options.testsRan) {
      json.coverage = this.getCoverageFileInfo();
      json.junit = this.getJunitFileInfo();
    }
    if (this.result.replacements?.size) {
      json.replacements = Object.fromEntries(this.result.replacements);
    }
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
      throw new SfError(messages.getMessage('deployCanceled', [canceledByName]), 'DeployFailed');
    }
    this.displaySuccesses();
    this.displayDeletions();
    this.displayFailures();
    this.displayTestResults();
    this.displayOutputFileLocations();
    this.displayReplacements();

    // Throw a DeployFailed error unless the deployment was successful.
    if (!this.isSuccess()) {
      // Add error message directly on the DeployResult (e.g., a GACK)
      const errMsg = this.getResponse()?.errorMessage ?? '';
      throw new SfError(messages.getMessage('deployFailed', [errMsg]), 'DeployFailed');
    }

    this.ux.log(messages.getMessage(this.isCheckOnly() ? 'checkOnlySuccessVerbose' : 'deploySuccess'));
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

  protected displayReplacements(): void {
    if (this.isVerbose() && this.result.replacements?.size) {
      this.ux.log('');
      this.ux.styledHeader(chalk.blue('Metadata Replacements'));
      const replacements = Array.from(this.result.replacements.entries()).flatMap(([filepath, stringsReplaced]) =>
        stringsReplaced.map((replaced) => ({
          filePath: path.relative(process.cwd(), filepath),
          replaced,
        }))
      );
      this.ux.table(replacements, {
        filePath: { header: 'PROJECT PATH' },
        replaced: { header: 'TEXT REPLACED' },
      });
    }
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
      this.ux.table(
        successes.map((success) => ({
          state: success.state,
          fullName: success.fullName,
          type: success.type,
          filePath: success.filePath,
        })),
        {
          fullName: { header: 'FULL NAME' },
          type: { header: 'TYPE' },
          filePath: { header: 'PROJECT PATH' },
        }
      );
    }
  }

  protected displayDeletions(): void {
    const deletions = this.fileResponses.filter((f) => f.state === ComponentStatus.Deleted);
    if (!deletions.length) {
      return;
    }
    this.sortFileResponses(deletions);
    this.asRelativePaths(deletions);

    this.ux.log('');
    this.ux.styledHeader(chalk.blue('Deleted Source'));
    this.ux.table(
      deletions.map((entry) => ({ fullName: entry.fullName, type: entry.type, filePath: entry.filePath })),
      {
        fullName: { header: 'FULL NAME' },
        type: { header: 'TYPE' },
        filePath: { header: 'PROJECT PATH' },
      }
    );
  }

  protected displayFailures(): void {
    if (this.hasStatus(RequestStatus.Failed) || this.hasStatus(RequestStatus.SucceededPartial)) {
      const failures: Array<FileResponse | DeployMessage> = [];
      const fileResponseFailures: Map<string, string> = new Map<string, string>();

      if (this.fileResponses?.length) {
        const fileResponses: FileResponse[] = [];
        this.fileResponses
          .filter((f) => f.state === ComponentStatus.Failed)
          .map((f) => {
            fileResponses.push(f);
            if ('error' in f) {
              fileResponseFailures.set(`${f.type}#${f.fullName}`, f.error);
            }
          });
        this.sortFileResponses(fileResponses);
        this.asRelativePaths(fileResponses);
        failures.push(...fileResponses);
      }

      const deployMessages = ensureArray(this.result?.response?.details?.componentFailures);
      if (deployMessages.length > failures.length) {
        // if there's additional failures in the API response, find the failure and add it to the output
        deployMessages.map((deployMessage) => {
          if (!fileResponseFailures.has(`${deployMessage.componentType}#${deployMessage.fullName}`)) {
            // duplicate the problem message to the error property for displaying in the table
            failures.push(Object.assign(deployMessage, { error: deployMessage.problem }));
          }
        });
      }

      if (failures.length) {
        this.ux.log('');
        this.ux.styledHeader(chalk.red(`Component Failures [${failures.length}]`));
        this.ux.table(
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          failures.map((entry: FileResponseFailure) => ({
            fullName: entry.fullName,
            problemType: entry.problemType,
            filePath: entry.filePath,
            columnNumber: entry.columnNumber,
            error: entry.error,
            lineNumber: entry.lineNumber,
            state: entry.state,
            type: entry.type,
          })),
          {
            problemType: { header: 'Type' },
            fullName: { header: 'Name' },
            error: { header: 'Problem' },
          },
          {
            'no-truncate': true,
          }
        );
        this.ux.log('');
      }
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
      const failures = ensureArray(this.result.response.details?.runTestResult?.failures);

      const tests = this.sortTestResults(failures);

      this.ux.log('');
      this.ux.styledHeader(
        chalk.red(`Test Failures [${asString(this.result.response.details.runTestResult?.numFailures)}]`)
      );
      this.ux.table(
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        tests.map((entry: Failures) => ({
          name: entry.name,
          methodName: entry.methodName,
          message: entry.message,
          stackTrace: entry.stackTrace,
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
    maybePrintCodeCoverageTable(this.result.response.details?.runTestResult?.codeCoverage, this.ux);
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
