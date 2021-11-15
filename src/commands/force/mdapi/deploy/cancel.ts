/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as os from 'os';
import { flags, FlagsConfig } from '@salesforce/command';
import { Messages } from '@salesforce/core';
import { Duration } from '@salesforce/kit';
import { getString } from '@salesforce/ts-types';
import { RequestStatus } from '@salesforce/source-deploy-retrieve';
import { DeployCommand } from '../../../../deployCommand';
import {
  DeployCancelCommandResult,
  DeployCancelResultFormatter,
} from '../../../../formatters/deployCancelResultFormatter';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'md.cancel');

export class Cancel extends DeployCommand {
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessage('examples').split(os.EOL);
  public static readonly requiresUsername = true;
  public static readonly flagsConfig: FlagsConfig = {
    wait: flags.minutes({
      char: 'w',
      default: Duration.minutes(DeployCommand.DEFAULT_WAIT_MINUTES),
      min: Duration.minutes(1),
      description: messages.getMessage('flags.wait'),
      longDescription: messages.getMessage('flags.waitLong'),
    }),
    jobid: flags.id({
      char: 'i',
      description: messages.getMessage('flags.jobid'),
    }),
  };
  // The most important difference between this and source:deploy:cancel
  public isSourceStash = false;

  public async run(): Promise<DeployCancelCommandResult> {
    await this.cancel();
    this.resolveSuccess();
    return this.formatResult();
  }

  protected async cancel(): Promise<void> {
    const deployId = this.resolveDeployId(this.getFlag<string>('jobid'));

    const deploy = this.createDeploy(deployId);
    await deploy.cancel();

    this.deployResult = await this.poll(deployId);
  }

  protected resolveSuccess(): void {
    const status = getString(this.deployResult, 'response.status');
    if (status !== RequestStatus.Canceled) {
      this.setExitCode(1);
    }
  }

  protected formatResult(): DeployCancelCommandResult {
    const formatter = new DeployCancelResultFormatter(this.logger, this.ux, this.deployResult);
    if (!this.isJsonOutput()) {
      formatter.display();
    }
    return formatter.getJson();
  }
}
