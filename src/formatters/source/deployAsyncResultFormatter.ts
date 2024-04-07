/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { EOL } from 'node:os';

import { Messages } from '@salesforce/core';
import { AsyncResult } from '@salesforce/source-deploy-retrieve';
import { Ux } from '@salesforce/sf-plugins-core';
import { ResultFormatter, ResultFormatterOptions } from '../resultFormatter.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'deploy');

export type DeployCommandAsyncResult = {
  outboundFiles: string[];
  deploys: DeployAsyncStatus[];
} & DeployAsyncStatus
// Per the AsyncResult MDAPI docs, only `id` is required/used. The rest is here for
// backwards compatibility.
// https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_asyncresult.htm
export type DeployAsyncStatus = {
  done: boolean;
  id: string;
  state: 'Queued';
  status: 'Queued';
  timedOut: boolean;
}

export class DeployAsyncResultFormatter extends ResultFormatter {
  protected result: AsyncResult;

  public constructor(ux: Ux, options: ResultFormatterOptions, result: AsyncResult) {
    super(ux, options);
    this.result = result;
  }

  /**
   * Get the JSON output from the AsyncDeployResult.
   *
   * @returns a DeployCommandAsyncResult.
   */
  public getJson(): DeployCommandAsyncResult {
    const asyncResult = {
      id: this.result.id,
      done: false,
      state: 'Queued',
      status: 'Queued',
      timedOut: true,
    } as DeployCommandAsyncResult;
    const resultClone = structuredClone(asyncResult);
    asyncResult.outboundFiles = [];
    asyncResult.deploys = [resultClone];

    return asyncResult;
  }

  /**
   * Displays async deploy results in human format.
   */
  public display(): void {
    this.ux.log(messages.getMessage('asyncDeployQueued'), EOL);
    this.ux.log(messages.getMessage('asyncDeployCancel', [this.result.id, this.options.username]));
    this.ux.log(messages.getMessage('asyncDeployReport', [this.result.id, this.options.username]));
  }
}
