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
import { ResultFormatterOptions } from '../resultFormatter.js';
import { DeployAsyncResultFormatter } from '../source/deployAsyncResultFormatter.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'md.deploy');

export class MdDeployAsyncResultFormatter extends DeployAsyncResultFormatter {
  protected declare result: AsyncResult;

  public constructor(ux: Ux, options: ResultFormatterOptions, result: AsyncResult) {
    super(ux, options, result);
    this.result = result;
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
