/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { DeployMessage, DeployResult, FileResponse } from '@salesforce/source-deploy-retrieve';
import * as chalk from 'chalk';
import { ensureArray } from '@salesforce/kit';
import { Ux } from '@salesforce/sf-plugins-core';
import { DeployCommandResult, DeployResultFormatter } from '../deployResultFormatter';
import { ResultFormatterOptions } from '../resultFormatter';

export class DeleteResultFormatter extends DeployResultFormatter {
  public constructor(ux: Ux, options: ResultFormatterOptions, result?: DeployResult) {
    super(ux, options, result);
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
    if (this.isSuccess()) {
      const successes: Array<FileResponse | DeployMessage> = [];
      const fileResponseSuccesses: Map<string, FileResponse> = new Map<string, FileResponse>();

      if (this.fileResponses?.length) {
        const fileResponses: FileResponse[] = [];
        this.fileResponses.map((f: FileResponse) => {
          fileResponses.push(f);
          fileResponseSuccesses.set(`${f.type}#${f.fullName}`, f);
        });
        this.sortFileResponses(fileResponses);
        this.asRelativePaths(fileResponses);
        successes.push(...fileResponses);
      }

      const deployMessages = ensureArray(this.result?.response?.details?.componentSuccesses).filter(
        (item) => !item.fileName.includes('package.xml')
      );
      if (deployMessages.length >= successes.length) {
        // if there's additional successes in the API response, find the success and add it to the output
        deployMessages.map((deployMessage) => {
          if (!fileResponseSuccesses.has(`${deployMessage.componentType}#${deployMessage.fullName}`)) {
            successes.push(
              Object.assign(deployMessage, {
                type: deployMessage.componentType,
              })
            );
          }
        });
      }

      this.ux.log('');
      this.ux.styledHeader(chalk.blue('Deleted Source'));
      this.ux.table(successes, {
        fullName: { header: 'FULL NAME' },
        type: { header: 'TYPE' },
        filePath: { header: 'PROJECT PATH' },
      });
    }
  }
}
