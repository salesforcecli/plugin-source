/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { DeployResult } from '@salesforce/source-deploy-retrieve';
import { UX } from '@salesforce/command';
import { Logger } from '@salesforce/core';
import * as chalk from 'chalk';
import { DeployCommandResult, DeployResultFormatter } from './deployResultFormatter';
import { ResultFormatterOptions } from './resultFormatter';

export class DeleteResultFormatter extends DeployResultFormatter {
  public constructor(logger: Logger, ux: UX, options: ResultFormatterOptions, result?: DeployResult) {
    super(logger, ux, options, result);
  }

  /**
   * Get the JSON output from the DeployResult.
   *
   * @returns a JSON formatted result matching the provided type.
   */
  public getJson(): DeployCommandResult {
    const json = this.getResponse() as DeployCommandResult;
    json.deletedSource = this.fileResponses; // to match toolbelt json output
    json.outboundFiles = []; // to match toolbelt version
    json.deletes = [Object.assign({}, this.getResponse())]; // to match toolbelt version

    return json;
  }

  public displayNoResultsFound(): void {
    // matches toolbelt
    this.ux.styledHeader(chalk.blue('Deleted Source'));
    this.ux.log('No results found');
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
      this.ux.styledHeader(chalk.blue('Deleted Source'));
      this.ux.table(successes, {
        columns: [
          { key: 'fullName', label: 'FULL NAME' },
          { key: 'type', label: 'TYPE' },
          { key: 'filePath', label: 'PROJECT PATH' },
        ],
      });
    }
  }
}
