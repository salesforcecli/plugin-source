/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ComponentSet, DeployResult } from '@salesforce/source-deploy-retrieve';
import { SfdxError, ConfigFile, ConfigAggregator } from '@salesforce/core';
import { MetadataApiDeployStatus } from '@salesforce/source-deploy-retrieve/lib/src/client/types';
import { asString, getBoolean } from '@salesforce/ts-types';
import { env } from '@salesforce/kit';
import { SourceCommand } from './sourceCommand';

export abstract class DeployCommand extends SourceCommand {
  public static STASH_KEY = 'SOURCE_DEPLOY';

  private deployIdDisplayed = false;

  public async deployReport(id?: string): Promise<DeployResult> {
    const deployId = this.resolveDeployId(id);

    this.displayDeployId(deployId);

    const res = await this.org.getConnection().metadata.checkDeployStatus(deployId, true);
    if (env.getBoolean('SFDX_USE_PROGRESS_BAR', true) && !this.isJsonOutput()) {
      this.initProgressBar();
      this.progressBar.start(res.numberTestsTotal + res.numberComponentsTotal);
      this.progressBar.update(res.numberTestsCompleted + res.numberComponentsDeployed);
      this.progressBar.stop();
    }

    const deployStatus = (res as unknown) as MetadataApiDeployStatus;
    return new DeployResult(deployStatus, new ComponentSet());
  }

  protected getStash(): ConfigFile<{ isGlobal: true; filename: 'stash.json' }> {
    return new ConfigFile({ isGlobal: true, filename: 'stash.json' });
  }

  protected resolveDeployId(id: string): string {
    if (id) {
      return id;
    } else {
      // try and read from the ~/.sfdx/stash.json file for the most recent deploy ID
      try {
        this.logger.debug('Reading from ~/.sfdx/stash.json for the deploy id');
        const stash = this.getStash();
        stash.readSync(true);
        return asString((stash.get(DeployCommand.STASH_KEY) as { jobid: string }).jobid);
      } catch (err: unknown) {
        const error = err as Error & { code: string };
        if (error.code === 'ENOENT') {
          throw SfdxError.create('@salesforce/plugin-source', 'deploy', 'MissingDeployId');
        }
        throw SfdxError.wrap(error);
      }
    }
  }

  protected displayDeployId(id: string): void {
    if (!this.isJsonOutput() && !this.deployIdDisplayed) {
      this.ux.log(`Deploy ID: ${id}`);
      this.deployIdDisplayed = true;
    }
  }

  // REST is the default unless:
  //   1. SOAP is specified with the soapdeploy flag on the command
  //   2. The restDeploy SFDX config setting is explicitly false.
  protected async isRestDeploy(): Promise<boolean> {
    if (getBoolean(this.flags, 'soapdeploy') === true) {
      this.logger.debug('soapdeploy flag === true.  Using SOAP');
      return false;
    }

    const aggregator = await ConfigAggregator.create();
    const restDeployConfig = aggregator.getPropertyValue('restDeploy');
    // aggregator property values are returned as strings
    if (restDeployConfig === 'false') {
      this.logger.debug('restDeploy SFDX config === false.  Using SOAP');
      return false;
    } else if (restDeployConfig === 'true') {
      this.logger.debug('restDeploy SFDX config === true.  Using REST');
    } else {
      this.logger.debug('soapdeploy flag unset. restDeploy SFDX config unset.  Defaulting to REST');
    }

    return true;
  }
}
