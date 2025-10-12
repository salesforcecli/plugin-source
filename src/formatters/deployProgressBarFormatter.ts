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

import { MetadataApiDeploy, MetadataApiDeployStatus } from '@salesforce/source-deploy-retrieve';
import { SingleBar } from 'cli-progress';

export class DeployProgressBarFormatter {
  protected progressBar = new SingleBar({
    format: 'DEPLOY PROGRESS | {bar} | {value}/{total} Components',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    linewrap: true,
    noTTYOutput: Boolean(process.env.TERM === 'dumb' || !process.stdin.isTTY),
  });

  public constructor() {}

  // displays the progress of the Deployment
  public progress(deploy: MetadataApiDeploy): void {
    this.progressBar.start(0, 0);
    deploy.onUpdate(
      ({
        numberComponentsTotal,
        numberTestsTotal,
        numberComponentsDeployed,
        numberTestsCompleted,
      }: MetadataApiDeployStatus) => {
        // the numberComponentsTotal isn't computed right away, wait to start until we know how many we have
        const total = numberComponentsTotal + numberTestsTotal;
        if (this.progressBar.getTotal() !== total) {
          this.progressBar.setTotal(total);
        }
        this.progressBar.update(numberComponentsDeployed + numberTestsCompleted);
      }
    );

    // any thing else should stop the progress bar
    deploy.onFinish((data) => {
      // the final tick of `onUpdate` is actually fired with `onFinish`
      const deployed = data.response.numberComponentsDeployed + data.response.numberTestsCompleted;

      // in cases when deploying only an object's customfields, without the custom object (think MPD)
      // the server initially returns the number of customfields (n) + 1 - but once the deploy has finished
      // it calculates the correct number of fields deployed n, and so we are left with a progress bar at n/(n+1)
      // so if the progress bar total is different from what was actually deployed, set the total to be accurate
      if (this.progressBar.getTotal() !== deployed) {
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
}
