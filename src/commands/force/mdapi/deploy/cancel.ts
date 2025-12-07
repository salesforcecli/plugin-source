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

import { Connection, Messages, SfError } from '@salesforce/core';
import { Duration } from '@salesforce/kit';
import { RequestStatus } from '@salesforce/source-deploy-retrieve';
import {
  Flags,
  loglevel,
  orgApiVersionFlagWithDeprecations,
  requiredOrgFlagWithDeprecations,
  Ux,
} from '@salesforce/sf-plugins-core';
import { Interfaces } from '@oclif/core';
import { DeployCommand } from '../../../../deployCommand.js';
import {
  DeployCancelCommandResult,
  DeployCancelResultFormatter,
} from '../../../../formatters/deployCancelResultFormatter.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'md.cancel');

const replacement = 'project deploy cancel';

export class Cancel extends DeployCommand {
  public static readonly description = messages.getMessage('description');
  public static readonly summary = messages.getMessage('summary');
  public static readonly examples = messages.getMessages('examples');
  public static readonly state = 'deprecated';
  public static readonly hidden = true;
  public static readonly deprecationOptions = {
    to: replacement,
    message: messages.getMessage('deprecation', [replacement]),
  };
  public static readonly flags = {
    'api-version': orgApiVersionFlagWithDeprecations,
    loglevel,
    'target-org': requiredOrgFlagWithDeprecations,
    wait: Flags.duration({
      char: 'w',
      unit: 'minutes',
      default: Duration.minutes(DeployCommand.DEFAULT_WAIT_MINUTES),
      min: 1,
      description: messages.getMessage('flags.wait.description'),
      summary: messages.getMessage('flags.wait.summary'),
    }),
    jobid: Flags.salesforceId({
      char: 'i',
      length: 'both',
      startsWith: '0Af',
      summary: messages.getMessage('flags.jobid.summary'),
    }),
  };
  private flags!: Interfaces.InferredFlags<typeof Cancel.flags>;
  private conn!: Connection;

  public async run(): Promise<DeployCancelCommandResult> {
    this.flags = (await this.parse(Cancel)).flags;
    this.conn = this.flags['target-org'].getConnection(this.flags['api-version']);
    await this.cancel();
    this.resolveSuccess();
    return this.formatResult();
  }

  protected async cancel(): Promise<void> {
    const deployId = this.resolveDeployId(this.flags.jobid);
    try {
      const deploy = this.createDeploy(this.conn, deployId);
      await deploy.cancel();

      this.deployResult = await this.poll(this.conn, deployId);
    } catch (e) {
      const err = e as Error;
      throw new SfError(messages.getMessage('CancelFailed', [err.message]), 'CancelFailed');
    }
  }

  protected resolveSuccess(): void {
    const status = this.deployResult.response.status;
    if (status !== RequestStatus.Canceled) {
      this.setExitCode(1);
    }
  }

  protected formatResult(): DeployCancelCommandResult {
    const formatter = new DeployCancelResultFormatter(new Ux({ jsonEnabled: this.jsonEnabled() }), this.deployResult);
    if (!this.jsonEnabled()) {
      formatter.display();
    }
    return formatter.getJson();
  }
}
