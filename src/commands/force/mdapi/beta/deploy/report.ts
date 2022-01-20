/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { EOL } from 'os';
import { Messages } from '@salesforce/core';
import { flags, FlagsConfig } from '@salesforce/command';
import { Duration, env } from '@salesforce/kit';
import { RequestStatus } from '@salesforce/source-deploy-retrieve';

import { MdDeployResult, MdDeployResultFormatter } from '../../../../../formatters/mdapi/mdDeployResultFormatter';
import { DeployCommand } from '../../../../../deployCommand';
import { ProgressFormatter } from '../../../../../formatters/progressFormatter';
import { DeployProgressBarFormatter } from '../../../../../formatters/deployProgressBarFormatter';
import { DeployProgressStatusFormatter } from '../../../../../formatters/deployProgressStatusFormatter';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'md.deployreport');

export class Report extends DeployCommand {
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessage('examples').split(EOL);
  public static readonly requiresUsername = true;

  public static readonly flagsConfig: FlagsConfig = {
    wait: flags.minutes({
      char: 'w',
      default: Duration.minutes(DeployCommand.DEFAULT_WAIT_MINUTES),
      min: Duration.minutes(1),
      description: messages.getMessage('flags.wait', [DeployCommand.DEFAULT_WAIT_MINUTES]),
      longDescription: messages.getMessage('flagsLong.wait', [DeployCommand.DEFAULT_WAIT_MINUTES]),
    }),
    jobid: flags.id({
      char: 'i',
      description: messages.getMessage('flags.jobId'),
      longDescription: messages.getMessage('flagsLong.jobId'),
      validate: DeployCommand.isValidDeployId,
    }),
    verbose: flags.builtin({
      description: messages.getMessage('flags.verbose'),
      longDescription: messages.getMessage('flagsLong.verbose'),
    }),
  };

  public async run(): Promise<MdDeployResult> {
    await this.doReport();
    this.resolveSuccess();
    return this.formatResult();
  }

  protected async doReport(): Promise<void> {
    if (this.flags.verbose) {
      this.ux.log(messages.getMessage('usernameOutput', [this.org.getUsername()]));
    }
    const deployId = this.resolveDeployId(this.getFlag<string>('jobid'));
    this.displayDeployId(deployId);

    const deploy = this.createDeploy(deployId);
    if (!this.isJsonOutput()) {
      const progressFormatter: ProgressFormatter = env.getBoolean('SFDX_USE_PROGRESS_BAR', true)
        ? new DeployProgressBarFormatter(this.logger, this.ux)
        : new DeployProgressStatusFormatter(this.logger, this.ux);
      progressFormatter.progress(deploy);
    }
    this.deployResult = await deploy.pollStatus(500, this.getFlag<Duration>('wait').seconds);
  }

  // this is different from the source:report uses report error codes (unfortunately)
  // See https://github.com/salesforcecli/toolbelt/blob/bfe361b0fb901b05c194a27a85849c689f4f6fea/src/lib/mdapi/mdapiDeployReportApi.ts#L413
  protected resolveSuccess(): void {
    const StatusCodeMap = new Map<RequestStatus, number>([
      [RequestStatus.Succeeded, 0],
      [RequestStatus.Canceled, 1],
      [RequestStatus.Failed, 1],
      [RequestStatus.SucceededPartial, 68],
      [RequestStatus.InProgress, 69],
      [RequestStatus.Pending, 69],
      [RequestStatus.Canceling, 69],
    ]);
    this.setExitCode(StatusCodeMap.get(this.deployResult.response?.status) ?? 1);
  }

  protected formatResult(): MdDeployResult {
    const formatter = new MdDeployResultFormatter(
      this.logger,
      this.ux,
      { verbose: this.getFlag<boolean>('verbose', false) },
      this.deployResult
    );

    // Only display results to console when JSON flag is unset.
    if (!this.isJsonOutput()) {
      formatter.display(true);
    }

    return formatter.getJson();
  }
}
