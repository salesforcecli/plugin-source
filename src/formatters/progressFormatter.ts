/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as chalk from 'chalk';
import { UX } from '@salesforce/command';
import { Logger } from '@salesforce/core';
import { MetadataApiDeployStatus } from '@salesforce/source-deploy-retrieve/lib/src/client/types';

export class ProgressFormatter {
  public logger: Logger;
  public ux: UX;

  public constructor(logger: Logger, ux: UX) {
    this.logger = logger;
    this.ux = ux;
  }

  // Prints the current status of the deployment
  public printStatus(data: MetadataApiDeployStatus): void {
    if (!data.done) {
      this.ux.log('');
      this.ux.styledHeader(chalk.yellow('Status'));
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

    const successfulComponentsMessage: string = data.checkOnly
      ? `Components checked:  ${data.numberComponentsDeployed}`
      : `Components deployed:  ${data.numberComponentsDeployed}`;
    this.ux.log('');
    this.ux.log(`Status:  ${data.status}`);
    this.ux.log(`jobid:  ${data.id}`);
    this.ux.log(`Component errors:  ${data.numberComponentErrors}`);
    this.ux.log(successfulComponentsMessage);
    this.ux.log(`Components total:  ${data.numberComponentsTotal}`);
    this.ux.log(`Tests errors:  ${data.numberTestErrors}`);
    this.ux.log(`Tests completed:  ${data.numberTestsCompleted}`);
    this.ux.log(`Tests total:  ${data.numberTestsTotal}`);
    this.ux.log(`Check only: ${data.checkOnly}`);
    this.ux.log('');
  }
}
