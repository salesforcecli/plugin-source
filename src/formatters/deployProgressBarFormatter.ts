/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { UX } from '@salesforce/command';
import { Logger } from '@salesforce/core';
import { MetadataApiDeploy } from '@salesforce/source-deploy-retrieve';
import { once } from '@salesforce/kit';
import cli from 'cli-ux';
import { ProgressBar } from '../types';
import { ProgressFormatter } from './progressFormatter';

export class DeployProgressBarFormatter extends ProgressFormatter {
  protected progressBar?: ProgressBar;
  public constructor(logger: Logger, ux: UX) {
    super(logger, ux);
  }

  // displays the progress of the Deployment
  public progress(deploy: MetadataApiDeploy): void {
    this.initProgressBar();
    const startProgressBar = once((componentTotal: number) => {
      this.progressBar.start(componentTotal);
    });

    deploy.onUpdate((data) => {
      // the numCompTot. isn't computed right away, wait to start until we know how many we have
      const total = data.numberComponentsTotal + data.numberTestsTotal;
      if (data.numberComponentsTotal) {
        startProgressBar(total);
        this.progressBar.update(data.numberComponentsDeployed + data.numberTestsCompleted);
      }

      // the numTestsTot. isn't computed until validated as tests by the server, update the PB once we know
      if (data.numberTestsTotal && data.numberComponentsTotal) {
        this.progressBar.setTotal(total);
      }
    });

    // any thing else should stop the progress bar
    deploy.onFinish((data) => {
      // the final tick of `onUpdate` is actually fired with `onFinish`
      const deployed = data.response.numberComponentsDeployed + data.response.numberTestsCompleted;

      // in cases when deploying only an object's customfields, without the custom object (think MPD)
      // the server initially returns the number of customfields (n) + 1 - but once the deploy has finished
      // it calculates the correct number of fields deployed n, and so we are left with a progress bar at n/(n+1)
      // so if the progress bar total is different from what was actually deployed, set the total to be accurate
      if (this.progressBar.total !== deployed) {
        this.progressBar.setTotal(deployed);
      }

      this.progressBar.update(deployed);
      this.progressBar.stop();
    });

    deploy.onCancel(() => {
      this.progressBar.stop();
    });

    deploy.onError((error: Error) => {
      this.progressBar.stop();
      throw error;
    });
  }

  // used to initialise the progress bar
  protected initProgressBar(): void {
    this.logger.debug('initializing progress bar');
    this.progressBar = cli.progress({
      format: 'DEPLOY PROGRESS | {bar} | {value}/{total} Components',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      linewrap: true,
    }) as ProgressBar;
  }
}
