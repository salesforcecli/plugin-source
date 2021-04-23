/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { blue } from 'chalk';
import { UX } from '@salesforce/command';
import { Logger, Messages } from '@salesforce/core';
import { get, getString, getNumber } from '@salesforce/ts-types';
import { RetrieveResult, MetadataApiRetrieveStatus } from '@salesforce/source-deploy-retrieve';
import {
  FileResponse,
  FileProperties,
  RequestStatus,
  RetrieveMessage,
} from '@salesforce/source-deploy-retrieve/lib/src/client/types';
import { ResultFormatter, ResultFormatterOptions } from './resultFormatter';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'retrieve');

export interface PackageRetrieval {
  name: string;
  path: string;
}

export interface RetrieveCommandResult {
  inboundFiles: FileResponse[];
  packages: PackageRetrieval[];
  warnings: RetrieveMessage[];
  response: MetadataApiRetrieveStatus;
}

export class RetrieveResultFormatter extends ResultFormatter {
  protected result: RetrieveResult;
  protected fileResponses: FileResponse[];

  public constructor(logger: Logger, ux: UX, options: ResultFormatterOptions, result: RetrieveResult) {
    super(logger, ux, options);
    this.result = result;
    this.fileResponses = result?.getFileResponses ? result.getFileResponses() : [];
  }

  /**
   * Get the JSON output from the RetrieveResult.
   *
   * @returns RetrieveCommandResult
   */
  public getJson(): RetrieveCommandResult {
    const warnMessages = get(this.result, 'response.messages', []);
    const warnings = Array.isArray(warnMessages) ? warnMessages : [warnMessages];
    return {
      inboundFiles: this.fileResponses,
      packages: [],
      warnings,
      response: this.result.response,
    };
  }

  /**
   * Displays retrieve results in human format.
   */
  public display(): void {
    if (this.hasStatus(RequestStatus.InProgress)) {
      const commandWaitTime = getNumber(this.options, 'waitTime', 33);
      this.ux.log(messages.getMessage('retrieveTimeout', [commandWaitTime]));
      return;
    }

    this.ux.styledHeader(blue(messages.getMessage('retrievedSourceHeader')));
    if (this.isSuccess()) {
      const fileProps = get(this.result, 'response.fileProperties', []) as FileProperties | FileProperties[];
      const fileProperties: FileProperties[] = Array.isArray(fileProps) ? fileProps : [fileProps];
      if (fileProperties.length) {
        const columns = [
          { key: 'fullName', label: 'FULL NAME' },
          { key: 'type', label: 'TYPE' },
          { key: 'fileName', label: 'PROJECT PATH' },
        ];
        this.ux.table(fileProperties, { columns });
      } else {
        this.ux.log(messages.getMessage('NoResultsFound'));
      }
    } else {
      this.ux.log('Retrieve Failed due to: (check this.result.response.messages)');
    }

    // if (results.status === 'SucceededPartial' && results.successes.length && results.failures.length) {
    //   this.ux.log('');
    //   this.ux.styledHeader(yellow(messages.getMessage('metadataNotFoundWarning')));
    //   results.failures.forEach((warning) => this.ux.log(warning.message));
    // }

    // Display any package retrievals
    // if (results.packages && results.packages.length) {
    //   this.logger.styledHeader(this.logger.color.blue('Retrieved Packages'));
    //   results.packages.forEach(pkg => {
    //     this.logger.log(`${pkg.name} package converted and retrieved to: ${pkg.path}`);
    //   });
    //   this.logger.log('');
    // }
  }

  protected hasStatus(status: RequestStatus): boolean {
    return getString(this.result, 'response.status') === status;
  }

  protected hasComponents(): boolean {
    return getNumber(this.result, 'components.size', 0) === 0;
  }
}
