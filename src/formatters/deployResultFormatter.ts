/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import * as chalk from 'chalk';
import { UX } from '@salesforce/command';
import { Logger, Messages } from '@salesforce/core';
import { getBoolean, getString, getNumber } from '@salesforce/ts-types';
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

// For async deploy command results it looks like this:
export interface DeployCommandAsyncResult extends DeployAsyncStatus {
  deployedSource: FileResponse[];
  outboundFiles: string[];
  deploys: DeployAsyncStatus[];
}
export interface DeployAsyncStatus {
  done: boolean;
  id: string;
  state: 'Queued';
  status: 'Queued';
  timedOut: boolean;
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
   * Get the JSON output from the DeployResult. The returned JSON shape
   * varies based on:
   *
   * 1. Standard synchronous deploy
   * 2. Asynchronous deploy (wait=0)
   *
   * @returns a JSON formatted result matching the provided type.
   */
  public getJson(): DeployCommandResult | DeployCommandAsyncResult {
    const json = this.result.response as DeployCommandResult | DeployCommandAsyncResult;
    json.deployedSource = this.fileResponses;
    json.outboundFiles = []; // to match toolbelt version
    json.deploys = [Object.assign({}, this.result.response)]; // to match toolbelt version

    if (this.isAsync()) {
      // json = this.result.response; // <-- TODO: ensure the response matches toolbelt
      return json as DeployCommandAsyncResult;
    }

    return json as DeployCommandResult;
  }

  /**
   * Displays deploy results in human format.  Output can vary based on:
   *
   * 1. Standard synchronous deploy (no tests run)
   * 2. Asynchronous deploy (wait=0)
   * 3. Checkonly deploy (checkonly=true)
   * 4. Deploy with test results
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
      this.ux.log(`The deployment has been canceled by ${canceledByName}`);
      return;
    }
    this.displaySuccesses();
    this.displayFailures();
    this.displayTestResults();
  }

  protected hasStatus(status: RequestStatus): boolean {
    return getString(this.result, 'response.status') === status;
  }

  protected hasComponents(): boolean {
    return getNumber(this.result, 'components.size', 0) === 0;
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

  protected displaySuccesses(): void {
    if (this.isSuccess() && this.hasComponents()) {
      //  sort by type then filename then fullname
      const files = this.fileResponses.sort((i, j) => {
        if (i.fullName === j.fullName) {
          // same metadata type, according to above comment sort on filename
          if (i.filePath === j.filePath) {
            // same filename's according to comment sort by fullName
            return i.fullName < j.fullName ? 1 : -1;
          }
          return i.filePath < j.filePath ? 1 : -1;
        }
        return i.type < j.type ? 1 : -1;
      });
      // get relative path for table output
      files.forEach((file) => {
        if (file.filePath) {
          file.filePath = path.relative(process.cwd(), file.filePath);
        }
      });
      this.ux.log('');
      this.ux.styledHeader(chalk.blue('Deployed Source'));
      this.ux.table(files, {
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
      // sort by filename then fullname
      const failures = this.fileResponses.sort((i, j) => {
        if (i.filePath === j.filePath) {
          // if they have the same directoryName then sort by fullName
          return i.fullName < j.fullName ? 1 : -1;
        }
        return i.filePath < j.filePath ? 1 : -1;
      });
      this.ux.log('');
      this.ux.styledHeader(chalk.red(`Component Failures [${failures.length}]`));
      this.ux.table(failures, {
        columns: [
          { key: 'componentType', label: 'Type' },
          { key: 'fileName', label: 'File' },
          { key: 'fullName', label: 'Name' },
          { key: 'problem', label: 'Problem' },
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
