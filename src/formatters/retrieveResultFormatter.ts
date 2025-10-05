/*
 * Copyright 2025, Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import chalk from 'chalk';
import { getNumber } from '@salesforce/ts-types';
import {
  RetrieveResult,
  MetadataApiRetrieveStatus,
  ComponentStatus,
  FileResponse,
  RequestStatus,
  RetrieveMessage,
} from '@salesforce/source-deploy-retrieve';
import { Ux } from '@salesforce/sf-plugins-core';
import { RetrieveFormatter } from './retrieveFormatter.js';
import { ResultFormatterOptions } from './resultFormatter.js';

export type PackageRetrieval = {
  name: string;
  path: string;
}

export type RetrieveResultFormatterOptions = {
  packages?: PackageRetrieval[];
} & ResultFormatterOptions

export type RetrieveCommandResult = {
  inboundFiles: FileResponse[];
  packages: PackageRetrieval[];
  warnings: RetrieveMessage[];
  response: MetadataApiRetrieveStatus;
};

export class RetrieveResultFormatter extends RetrieveFormatter {
  protected packages: PackageRetrieval[] = [];
  protected fileResponses: FileResponse[];

  public constructor(ux: Ux, options: RetrieveResultFormatterOptions, result: RetrieveResult) {
    super(ux, options, result);
    this.fileResponses = result?.getFileResponses ? result.getFileResponses() : [];
    this.packages = options.packages ?? [];
  }

  /**
   * Get the JSON output from the RetrieveResult.
   *
   * @returns RetrieveCommandResult
   */
  public getJson(): RetrieveCommandResult {
    return {
      inboundFiles: this.fileResponses,
      packages: this.packages,
      warnings: this.warnings,
      response: this.result,
    };
  }

  /**
   * Displays retrieve results in human format.
   */
  public display(): void {
    if (this.hasStatus(RequestStatus.InProgress)) {
      const commandWaitTime = getNumber(this.options, 'waitTime', 33);
      this.ux.log(this.messages.getMessage('retrieveTimeout', [commandWaitTime]));
      return;
    }

    if (this.isSuccess()) {
      this.ux.styledHeader(chalk.blue(this.messages.getMessage('retrievedSourceHeader')));
      const retrievedFiles = this.fileResponses.filter((fr) => fr.state !== ComponentStatus.Failed);
      if (retrievedFiles?.length) {
        this.displaySuccesses(retrievedFiles);
      } else {
        this.ux.log(this.messages.getMessage('NoResultsFound'));
      }
      if (this.warnings.length) {
        this.displayWarnings();
      }
    } else {
      this.displayErrors();
    }

    // Display any package retrievals
    if (this.packages?.length) {
      this.ux.log('');
      this.ux.styledHeader(chalk.blue('Retrieved Packages'));
      this.packages.forEach((pkg) => {
        this.ux.log(`${pkg.name} package converted and retrieved to: ${pkg.path}`);
      });
      this.ux.log('');
    }
  }

  private displaySuccesses(retrievedFiles: FileResponse[]): void {
    this.sortFileResponses(retrievedFiles);
    this.asRelativePaths(retrievedFiles);
    this.ux.table(
      retrievedFiles.map((retrieved) => ({
        fullName: retrieved.fullName,
        type: retrieved.type,
        filePath: retrieved.filePath,
        state: retrieved.state,
      })),
      {
        fullName: { header: 'FULL NAME' },
        type: { header: 'TYPE' },
        filePath: { header: 'PROJECT PATH' },
        state: { header: 'STATE' },
      }
    );
  }
}
