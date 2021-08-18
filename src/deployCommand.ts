/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ComponentSet, DeployResult, MetadataApiDeployStatus } from '@salesforce/source-deploy-retrieve';
import { SfdxError, ConfigFile, ConfigAggregator, PollingClient, StatusResult } from '@salesforce/core';
import { AnyJson, asString, getBoolean } from '@salesforce/ts-types';
import { Duration, once } from '@salesforce/kit';
import { SourceCommand } from './sourceCommand';

export abstract class DeployCommand extends SourceCommand {
  protected static readonly STASH_KEY = 'SOURCE_DEPLOY';

  protected displayDeployId = once((id: string) => {
    if (!this.isJsonOutput()) {
      this.ux.log(`Deploy ID: ${id}`);
    }
  });

  protected deployResult: DeployResult;

  /**
   * Request a report of an in-progess or completed deployment.
   *
   * @param id the Deploy ID of a deployment request
   * @returns DeployResult
   */
  protected async report(id?: string): Promise<DeployResult> {
    const deployId = this.resolveDeployId(id);
    this.displayDeployId(deployId);

    const res = await this.org.getConnection().metadata.checkDeployStatus(deployId, true);

    const deployStatus = res as unknown as MetadataApiDeployStatus;
    const componentSet = this.componentSet || new ComponentSet();
    return new DeployResult(deployStatus, componentSet);
  }

  protected setStash(deployId: string): void {
    const file = this.getStash();
    this.logger.debug(`Stashing deploy ID: ${deployId} in ${file.getPath()}`);
    file.writeSync({ [DeployCommand.STASH_KEY]: { jobid: deployId } });
  }

  protected resolveDeployId(id: string): string {
    if (id) {
      return id;
    } else {
      try {
        const stash = this.getStash();
        stash.readSync(true);
        const deployId = asString((stash.get(DeployCommand.STASH_KEY) as { jobid: string }).jobid);
        this.logger.debug(`Using deploy ID: ${deployId} from ${stash.getPath()}`);
        return deployId;
      } catch (err: unknown) {
        const error = err as Error & { code: string };
        if (error.code === 'ENOENT') {
          throw SfdxError.create('@salesforce/plugin-source', 'deploy', 'MissingDeployId');
        }
        throw SfdxError.wrap(error);
      }
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
      return true;
    } else {
      this.logger.debug('soapdeploy flag unset. restDeploy SFDX config unset.  Defaulting to SOAP');
    }

    return false;
  }

  protected async poll(deployId: string, options?: Partial<PollingClient.Options>): Promise<DeployResult> {
    const defaultOptions: PollingClient.Options = {
      frequency: options?.frequency ?? Duration.seconds(1),
      timeout: options?.timeout ?? (this.flags.wait as Duration),
      poll: async (): Promise<StatusResult> => {
        const deployResult = await this.report(deployId);
        return {
          completed: getBoolean(deployResult, 'response.done'),
          payload: deployResult as unknown as AnyJson,
        };
      },
    };
    const pollingOptions = { ...defaultOptions, ...options };
    const pollingClient = await PollingClient.create(pollingOptions);
    return pollingClient.subscribe() as unknown as Promise<DeployResult>;
  }

  private getStash(): ConfigFile<{ isGlobal: true; filename: 'stash.json' }> {
    return new ConfigFile({ isGlobal: true, filename: 'stash.json' });
  }
}
