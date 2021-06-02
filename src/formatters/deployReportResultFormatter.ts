/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { MetadataApiDeployStatus } from '@salesforce/source-deploy-retrieve/lib/src/client/types';
import { getString } from '@salesforce/ts-types';
import { DeployResultFormatter } from './deployResultFormatter';

export type DeployReportCommandResult = MetadataApiDeployStatus;

export class DeployReportResultFormatter extends DeployResultFormatter {
  public display(): void {
    const status = getString(this, 'result.response.status', 'unknown');
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
      } else {
        this.ux.log('No components deployed');
      }
      return;
    }
    this.displaySuccesses();
    this.displayFailures();
    this.displayTestResults();
  }
}
