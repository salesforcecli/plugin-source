/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as os from 'os';
import { Messages, SfdxProject } from '@salesforce/core';
import { flags, FlagsConfig } from '@salesforce/command';
import { Duration, env } from '@salesforce/kit';
import { ComponentSetBuilder } from '@salesforce/source-deploy-retrieve';
import { DeployCommand } from '../../../../deployCommand';
import {
  DeployReportCommandResult,
  DeployReportResultFormatter,
} from '../../../../formatters/deployReportResultFormatter';
import { ProgressFormatter } from '../../../../formatters/progressFormatter';
import { DeployProgressBarFormatter } from '../../../../formatters/deployProgressBarFormatter';
import { DeployProgressStatusFormatter } from '../../../../formatters/deployProgressStatusFormatter';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'report');

export class Report extends DeployCommand {
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessage('examples').split(os.EOL);
  public static readonly requiresUsername = true;
  public static readonly flagsConfig: FlagsConfig = {
    wait: flags.minutes({
      char: 'w',
      default: Duration.minutes(DeployCommand.DEFAULT_WAIT_MINUTES),
      min: Duration.minutes(1),
      description: messages.getMessage('flags.wait'),
      longDescription: messages.getMessage('flagsLong.wait'),
    }),
    jobid: flags.id({
      char: 'i',
      description: messages.getMessage('flags.jobid'),
      longDescription: messages.getMessage('flagsLong.jobid'),
      validate: DeployCommand.isValidDeployId,
    }),
    verbose: flags.builtin({
      description: messages.getMessage('flags.verbose'),
    }),
  };
  public async run(): Promise<DeployReportCommandResult> {
    await this.doReport();
    this.resolveSuccess();
    return this.formatResult();
  }

  protected async doReport(): Promise<void> {
    const deployId = this.resolveDeployId(this.getFlag<string>('jobid'));

    // If the verbose flag is set, AND the command was executed from within
    // an SFDX project, we need to build a ComponentSet so we have mapped
    // source file output.
    if (this.getFlag<boolean>('verbose')) {
      let sourcepath: string[];
      try {
        this.project = await SfdxProject.resolve();
        sourcepath = this.project.getUniquePackageDirectories().map((pDir) => pDir.fullPath);
      } catch (err) {
        // ignore the error. this was just to get improved command output.
      }
      this.componentSet = await ComponentSetBuilder.build({ sourcepath });
    }

    const waitDuration = this.getFlag<Duration>('wait');
    const deploy = this.createDeploy(deployId);
    if (!this.isJsonOutput()) {
      const progressFormatter: ProgressFormatter = env.getBoolean('SFDX_USE_PROGRESS_BAR', true)
        ? new DeployProgressBarFormatter(this.logger, this.ux)
        : new DeployProgressStatusFormatter(this.logger, this.ux);
      progressFormatter.progress(deploy);
    }
    await deploy.pollStatus({ timeout: waitDuration });
    this.deployResult = await this.report(deployId);
  }

  // No-op implementation since any DeployResult status would be a success.
  // The only time this command would report an error is if it failed
  // flag parsing or some error during the request, and those are captured
  // by the command framework.
  /* eslint-disable-next-line @typescript-eslint/no-empty-function */
  protected resolveSuccess(): void {}

  protected formatResult(): DeployReportCommandResult {
    const formatterOptions = {
      verbose: this.getFlag<boolean>('verbose', false),
    };
    const formatter = new DeployReportResultFormatter(this.logger, this.ux, formatterOptions, this.deployResult);

    if (!this.isJsonOutput()) {
      formatter.display();
    }
    return formatter.getJson() as DeployReportCommandResult;
  }
}
