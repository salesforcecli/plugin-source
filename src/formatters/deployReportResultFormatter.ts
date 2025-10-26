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

import { MetadataApiDeployStatus, RequestStatus } from '@salesforce/source-deploy-retrieve';
import { SfError, Messages } from '@salesforce/core';
import { DeployResultFormatter } from './deployResultFormatter.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
export type DeployReportCommandResult = MetadataApiDeployStatus;

export class DeployReportResultFormatter extends DeployResultFormatter {
  public display(): void {
    const status = this.result.response.status ?? 'unknown';
    this.ux.log(`Status: ${status}`);
    if (!this.isVerbose()) {
      const componentsTotal = this.getNumResult('numberComponentsTotal');
      if (componentsTotal) {
        const componentsDeployed = this.getNumResult('numberComponentsDeployed');
        const componentErrors = this.getNumResult('numberComponentErrors');
        const testsTotal = this.getNumResult('numberTestsTotal');
        const testsCompleted = this.getNumResult('numberTestsCompleted');
        const testErrors = this.getNumResult('numberTestErrors');

        // We can do the below, or maybe something like:
        //   Components deployed: 12/70/2 | Tests Run: 4/33/0
        const deploys = `Deployed: ${componentsDeployed}/${componentsTotal}`;
        const deployErrors = `Errors: ${componentErrors}`;
        const tests = `Tests Complete: ${testsCompleted}/${testsTotal}`;
        const testErrs = `Errors: ${testErrors}`;
        this.ux.log(`${deploys} ${deployErrors}`);
        this.ux.log(`${tests} ${testErrs}`);
        this.displayOutputFileLocations();
      } else {
        this.ux.log('No components deployed');
      }
    } else {
      this.displaySuccesses();
      this.displayFailures();
      this.displayTestResults();
      this.displayOutputFileLocations();
    }

    if (status === RequestStatus.Failed) {
      const messages = Messages.loadMessages('@salesforce/plugin-source', 'report');
      throw new SfError(messages.getMessage('mdapiDeployFailed'), 'mdapiDeployFailed');
    }

    return;
  }
}
