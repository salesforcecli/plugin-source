/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Messages, SfError } from '@salesforce/core';
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
const messages = Messages.loadMessages('@salesforce/plugin-source', 'cancel');

const replacement = 'project deploy cancel';
export class Cancel extends DeployCommand {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
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
      unit: 'minutes',
      char: 'w',
      default: Duration.minutes(DeployCommand.DEFAULT_WAIT_MINUTES),
      min: 1,
      description: messages.getMessage('flags.wait.description'),
      summary: messages.getMessage('flags.wait.summary'),
    }),
    jobid: Flags.salesforceId({
      char: 'i',
      summary: messages.getMessage('flags.jobid.summary'),
      startsWith: '0Af',
    }),
  };

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  private flags: Interfaces.InferredFlags<typeof Cancel.flags>;

  public async run(): Promise<DeployCancelCommandResult> {
    this.flags = (await this.parse(Cancel)).flags;
    await this.cancel();
    this.resolveSuccess();
    return this.formatResult();
  }

  protected async cancel(): Promise<void> {
    const conn = this.flags['target-org'].getConnection(this.flags['api-version']);
    const deployId = this.resolveDeployId(this.flags.jobid);
    try {
      const deploy = this.createDeploy(conn, deployId);
      await deploy.cancel();

      this.deployResult = await this.poll(conn, deployId);
    } catch (e) {
      const err = e as Error;
      throw new SfError(messages.getMessage('CancelFailed', [err.message]), 'CancelFailed');
    }
  }

  protected resolveSuccess(): void {
    const status = this.deployResult?.response.status;
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
