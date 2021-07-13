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
import { MetadataApiDeployStatus } from '@salesforce/source-deploy-retrieve/lib/src/client/types';
import { MetadataApiDeploy } from '@salesforce/source-deploy-retrieve';
import { ProgressFormatter } from './progressFormatter';
export class DeployProgressStatusFormatter extends ProgressFormatter {
  public constructor(logger: Logger, ux: UX) {
    super(logger, ux);
  }

  // This can be used to print the progress of the deployment.
  public progress(deploy: MetadataApiDeploy): void {
    deploy.onUpdate((data) => {
      this.printDeployStatus(data);
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
      this.ux.styledHeader(chalk.yellow('Status'));
      this.ux.log('');
    } else {
      if (data.completedDate) {
        const deployStart: number = new Date(data.createdDate).getTime();
        const deployEnd: number = new Date(data.completedDate).getTime();
        this.ux.log(`Deployment finished in ${deployEnd - deployStart}ms`);
      }
      this.ux.log('');
      const successHeader: string = chalk.green('Result');
      const failureHeader: string = chalk.red('Result');
      const header: string = data.success ? successHeader : failureHeader;
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
      const testErrs = `Errors: ${testErrors}.`;
      this.ux.log(`Components: ${data.status}. ${deploys} ${deployErrors}`);
      this.ux.log(`Tests: ${data.status}. ${tests} ${testErrs}`);
    } else {
      this.ux.log('No components deployed');
    }
    this.ux.log('');
  }
}
