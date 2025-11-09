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
import chalk from 'chalk';
import { getNumber } from '@salesforce/ts-types';
import { MetadataApiDeploy, MetadataApiDeployStatus } from '@salesforce/source-deploy-retrieve';
import { Duration } from '@salesforce/kit';
import { Ux } from '@salesforce/sf-plugins-core';
import { ProgressFormatter } from './progressFormatter.js';
import { ResultFormatterOptions } from './resultFormatter.js';

export class DeployProgressStatusFormatter extends ProgressFormatter {
  private previousComponents = -1;
  private previousTests = -1;
  public constructor(ux: Ux, private options?: ResultFormatterOptions) {
    super(ux);
  }

  // This can be used to print the progress of the deployment.
  public progress(deploy: MetadataApiDeploy): void {
    deploy.onUpdate((data) => {
      // Print status when:
      //   1. Number of deployed components increases
      //   2. Number of tests completed increases
      //   3. Command is running in verbose mode (for updates on each poll)
      if (
        data.numberComponentsDeployed > this.previousComponents ||
        data.numberTestsCompleted > this.previousTests ||
        this.options?.verbose
      ) {
        this.printDeployStatus(data);
        this.previousComponents = data.numberComponentsDeployed;
        this.previousTests = data.numberTestsCompleted;
      }
    });
    deploy.onFinish((data) => {
      this.printDeployStatus(data.response);
    });
    deploy.onError((error: Error) => {
      throw error;
    });
  }

  // Prints Deploying status
  private printDeployStatus(data: MetadataApiDeployStatus): void {
    if (!data.done) {
      this.ux.log('');
      this.ux.styledHeader(chalk.yellow(`Status: ${data.status}`));
      this.ux.log('');
    } else {
      if (data.completedDate) {
        const deployStart: number = new Date(data.createdDate).getTime();
        const deployEnd: number = new Date(data.completedDate).getTime();
        const duration = Duration.seconds((deployEnd - deployStart) / 1000);
        this.ux.log(`Deployment finished in ${duration.toString()} `);
      }
      this.ux.log('');
      const header: string = data.success ? chalk.green(`Result: ${data.status}`) : chalk.red(`Result: ${data.status}`);
      this.ux.styledHeader(header);
      this.ux.log('');
    }
    const componentsTotal = getNumber(data, 'numberComponentsTotal');
    if (componentsTotal) {
      const componentsDeployed = getNumber(data, 'numberComponentsDeployed');
      const componentErrors = getNumber(data, 'numberComponentErrors');
      const testsTotal = getNumber(data, 'numberTestsTotal');
      const testsCompleted = getNumber(data, 'numberTestsCompleted');
      const testErrors = getNumber(data, 'numberTestErrors');
      const deploys = `${componentsDeployed ?? 0}/${componentsTotal ?? 0} components deployed.`;
      const deployErrors = componentErrors === 1 ? `${componentErrors} error.` : `${componentErrors ?? 0} errors.`;
      const tests = `${testsCompleted ?? 0}/${testsTotal ?? 0} tests completed.`;
      const testErrs = testErrors === 1 ? `${testErrors} error.` : `${testErrors ?? 0} errors.`;
      this.ux.log(`${deploys} ${deployErrors}`);
      this.ux.log(`${tests} ${testErrs}`);
    } else {
      this.ux.log('No components deployed');
    }
    this.ux.log('');
  }
}
