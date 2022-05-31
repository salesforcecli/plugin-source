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
import { MdDeployResult, MdDeployResultFormatter } from '../../../../formatters/mdapi/mdDeployResultFormatter';
import { DeployCommand, reportsFormatters } from '../../../../deployCommand';
import { ProgressFormatter } from '../../../../formatters/progressFormatter';
import { DeployProgressBarFormatter } from '../../../../formatters/deployProgressBarFormatter';
import { DeployProgressStatusFormatter } from '../../../../formatters/deployProgressStatusFormatter';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'md.deployreport');

export class Report extends DeployCommand {
  public static aliases = ['force:mdapi:beta:deploy:report'];
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessage('examples').split(EOL);
  public static readonly requiresUsername = true;

  public static readonly flagsConfig: FlagsConfig = {
    wait: flags.minutes({
      char: 'w',
      default: Duration.minutes(0),
      min: Duration.minutes(-1),
      description: messages.getMessage('flags.wait'),
      longDescription: messages.getMessage('flagsLong.wait'),
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
    concise: flags.builtin({
      description: messages.getMessage('flags.concise'),
    }),
    resultsdir: flags.directory({
      description: messages.getMessage('flags.resultsDir'),
    }),
    coverageformatters: flags.array({
      description: messages.getMessage('flags.coverageFormatters'),
      options: reportsFormatters,
      helpValue: reportsFormatters.join(','),
    }),
    junit: flags.boolean({ description: messages.getMessage('flags.junit') }),
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
    const waitFlag = this.getFlag<Duration>('wait');
    const waitDuration = waitFlag.minutes === -1 ? Duration.days(7) : waitFlag;

    this.isAsync = waitDuration.quantity === 0;

    const deployId = this.resolveDeployId(this.getFlag<string>('jobid'));

    this.resultsDir = this.resolveOutputDir(
      this.getFlag<string[]>('coverageformatters', undefined),
      this.getFlag<boolean>('junit'),
      this.getFlag<string>('resultsdir'),
      deployId,
      false
    );

    if (this.isAsync) {
      this.deployResult = await this.report(this.getFlag<string>('jobid'));
      return;
    }

    this.displayDeployId(deployId);

    const deploy = this.createDeploy(deployId);
    if (!this.isJsonOutput()) {
      const progressFormatter: ProgressFormatter = env.getBoolean('SFDX_USE_PROGRESS_BAR', true)
        ? new DeployProgressBarFormatter(this.logger, this.ux)
        : new DeployProgressStatusFormatter(this.logger, this.ux);
      progressFormatter.progress(deploy);
    }
    this.deployResult = await deploy.pollStatus({ frequency: Duration.milliseconds(500), timeout: waitDuration });
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
      {
        concise: this.getFlag<boolean>('concise', false),
        verbose: this.getFlag<boolean>('verbose', false),
        coverageOptions: this.getCoverageFormattersOptions(this.getFlag<string[]>('coverageformatters', undefined)),
        junitTestResults: this.getFlag<boolean>('junit', false),
        resultsDir: this.resultsDir,
        testsRan: !!this.deployResult?.response?.numberTestsTotal,
      },
      this.deployResult
    );

    this.maybeCreateRequestedReports();

    // Only display results to console when JSON flag is unset.
    if (!this.isJsonOutput()) {
      formatter.display(true);
    }

    return formatter.getJson();
  }
}
