/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as chalk from 'chalk';
import { UX } from '@salesforce/command';
import { Logger } from '@salesforce/core';
import { getNumber } from '@salesforce/ts-types';
import { MetadataApiDeploy, MetadataApiDeployStatus } from '@salesforce/source-deploy-retrieve';
import { Duration } from '@salesforce/kit';
import { ProgressFormatter } from './progressFormatter';
export class DeployProgressStatusFormatter extends ProgressFormatter {
  private previousComponents = -1;
  private previousTests = -1;
  public constructor(logger: Logger, ux: UX) {
    super(logger, ux);
  }

  // This can be used to print the progress of the deployment.
  public progress(deploy: MetadataApiDeploy): void {
    deploy.onUpdate((data) => {
      // Printing status only when number of components or tests gets changed in progress.
      if (data.numberComponentsDeployed > this.previousComponents || data.numberTestsCompleted > this.previousTests) {
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
      const deploys = `${componentsDeployed}/${componentsTotal} components deployed.`;
      const deployErrors = componentErrors === 1 ? `${componentErrors} error.` : `${componentErrors} errors.`;
      const tests = `${testsCompleted}/${testsTotal} tests completed.`;
      const testErrs = testErrors === 1 ? `${testErrors} error.` : `${testErrors} errors.`;
      this.ux.log(`${deploys} ${deployErrors}`);
      this.ux.log(`${tests} ${testErrs}`);
    } else {
      this.ux.log('No components deployed');
    }
    this.ux.log('');
  }
}
