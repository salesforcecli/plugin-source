/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { blue } from 'chalk';
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
import { RetrieveFormatter } from './retrieveFormatter';
import { ResultFormatterOptions } from './resultFormatter';

export interface PackageRetrieval {
  name: string;
  path: string;
}

export interface RetrieveResultFormatterOptions extends ResultFormatterOptions {
  packages?: PackageRetrieval[];
}

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
    this.packages = options.packages || [];
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
      this.ux.styledHeader(blue(this.messages.getMessage('retrievedSourceHeader')));
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
      this.ux.styledHeader(blue('Retrieved Packages'));
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
