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

import { getString } from '@salesforce/ts-types';
import { DeployResult, MetadataApiDeployStatus } from '@salesforce/source-deploy-retrieve';
import { Ux } from '@salesforce/sf-plugins-core';
import { ResultFormatter } from './resultFormatter.js';

export type DeployCancelCommandResult = MetadataApiDeployStatus;

export class DeployCancelResultFormatter extends ResultFormatter {
  protected result: DeployResult;

  public constructor(ux: Ux, result: DeployResult) {
    super(ux);
    this.result = result;
  }

  public getJson(): DeployCancelCommandResult {
    return this.result.response;
  }

  public display(): void {
    const deployId = this.result.response.id;
    if (this.isSuccess()) {
      this.ux.log(`Successfully canceled ${deployId}`);
    } else {
      let errMsg = `Could not cancel ${deployId}`;
      const errMsgDueTo = getString(this.result, 'response.errorMessage');
      if (errMsgDueTo) {
        errMsg = `${errMsg} Due to: ${errMsgDueTo}`;
      }
      this.ux.warn(errMsg);
    }
  }
}
