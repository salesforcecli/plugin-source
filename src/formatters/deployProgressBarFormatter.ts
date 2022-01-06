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
import { ProgressBar } from '../sourceCommand';
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
      if (data.numberComponentsTotal) {
        startProgressBar(data.numberComponentsTotal + data.numberTestsTotal);
        this.progressBar.update(data.numberComponentsDeployed + data.numberTestsCompleted);
      }

      // the numTestsTot. isn't computed until validated as tests by the server, update the PB once we know
      if (data.numberTestsTotal && data.numberComponentsTotal) {
        this.progressBar.setTotal(data.numberComponentsTotal + data.numberTestsTotal);
      }
    });

    // any thing else should stop the progress bar
    deploy.onFinish((data) => {
      // the final tick of `onUpdate` is actually fired with `onFinish`
      this.progressBar.update(data.response.numberComponentsDeployed + data.response.numberTestsCompleted);
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

  // used to intialise the progress bar
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
