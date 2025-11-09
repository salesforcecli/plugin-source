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
