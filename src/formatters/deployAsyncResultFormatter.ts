/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { EOL } from 'os';
import { UX } from '@salesforce/command';
import { Logger, Messages } from '@salesforce/core';
import { cloneJson } from '@salesforce/kit';
import { AsyncResult } from '@salesforce/source-deploy-retrieve';
import { ResultFormatter, ResultFormatterOptions } from './resultFormatter';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'deploy');

export interface DeployCommandAsyncResult extends DeployAsyncStatus {
  outboundFiles: string[];
  deploys: DeployAsyncStatus[];
}
// Per the AsyncResult MDAPI docs, only `id` is required/used. The rest is here for
// backwards compatibility.
// https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_asyncresult.htm
export interface DeployAsyncStatus {
  done: boolean;
  id: string;
  state: 'Queued';
  status: 'Queued';
  timedOut: boolean;
}

export class DeployAsyncResultFormatter extends ResultFormatter {
  protected result: AsyncResult;

  public constructor(logger: Logger, ux: UX, options: ResultFormatterOptions, result: AsyncResult) {
    super(logger, ux, options);
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
    const resultClone = cloneJson(asyncResult);
    asyncResult.outboundFiles = [];
    asyncResult.deploys = [resultClone];

    return asyncResult;
  }

  /**
   * Displays async deploy results in human format.
   */
  public display(): void {
    this.ux.log(messages.getMessage('asyncDeployQueued'), EOL);
    this.ux.log(messages.getMessage('asyncDeployCancel', [this.result.id]));
    this.ux.log(messages.getMessage('asyncDeployReport', [this.result.id]));
  }
}
