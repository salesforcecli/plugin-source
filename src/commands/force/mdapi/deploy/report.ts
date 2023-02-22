/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { Messages, Org } from '@salesforce/core';
import { Duration, env } from '@salesforce/kit';
import { RequestStatus } from '@salesforce/source-deploy-retrieve';
import {
  Flags,
  loglevel,
  orgApiVersionFlagWithDeprecations,
  requiredOrgFlagWithDeprecations,
  Ux,
} from '@salesforce/sf-plugins-core';
import { Interfaces } from '@oclif/core';
import { MdDeployResult, MdDeployResultFormatter } from '../../../../formatters/mdapi/mdDeployResultFormatter';
import { DeployCommand, getCoverageFormattersOptions, reportsFormatters } from '../../../../deployCommand';
import { ProgressFormatter } from '../../../../formatters/progressFormatter';
import { DeployProgressBarFormatter } from '../../../../formatters/deployProgressBarFormatter';
import { DeployProgressStatusFormatter } from '../../../../formatters/deployProgressStatusFormatter';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'md.deployreport');

export class Report extends DeployCommand {
  public static aliases = ['force:mdapi:beta:deploy:report'];
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    'api-version': orgApiVersionFlagWithDeprecations,
    loglevel,
    'target-org': requiredOrgFlagWithDeprecations,
    wait: Flags.duration({
      char: 'w',
      defaultValue: 0,
      min: -1,
      unit: 'minutes',
      description: messages.getMessage('flags.wait'),
      summary: messages.getMessage('flagsLong.wait'),
    }),
    jobid: Flags.salesforceId({
      char: 'i',
      startsWith: '0Af',
      length: 'both',
      description: messages.getMessage('flags.jobId'),
      summary: messages.getMessage('flagsLong.jobId'),
    }),
    verbose: Flags.boolean({
      description: messages.getMessage('flags.verbose'),
      summary: messages.getMessage('flagsLong.verbose'),
    }),
    concise: Flags.boolean({
      description: messages.getMessage('flags.concise'),
    }),
    resultsdir: Flags.directory({
      description: messages.getMessage('flags.resultsDir'),
    }),
    coverageformatters: Flags.string({
      multiple: true,
      description: messages.getMessage('flags.coverageFormatters'),
      options: reportsFormatters,
      helpValue: reportsFormatters.join(','),
    }),
    junit: Flags.boolean({ description: messages.getMessage('flags.junit') }),
  };

  private flags: Interfaces.InferredFlags<typeof Report.flags>;
  private org: Org;

  public async run(): Promise<MdDeployResult> {
    this.flags = (await this.parse(Report)).flags;
    this.org = this.flags['target-org'];

    await this.doReport();
    this.resolveSuccess();
    return this.formatResult();
  }

  protected async doReport(): Promise<void> {
    if (this.flags.verbose) {
      this.log(messages.getMessage('usernameOutput', [this.org.getUsername()]));
    }
    const waitFlag = this.flags.wait;
    const waitDuration = waitFlag.minutes === -1 ? Duration.days(7) : waitFlag;

    this.isAsync = waitDuration.quantity === 0;

    const deployId = this.resolveDeployId(this.flags.jobid);

    this.resultsDir = this.resolveOutputDir(
      this.flags.coverageformatters,
      this.flags.junit,
      this.flags.resultsdir,
      deployId,
      false
    );

    if (this.isAsync) {
      this.deployResult = await this.report(this.org.getConnection(), deployId);
      return;
    }

    const deploy = this.createDeploy(this.org.getConnection(), deployId);
    if (!this.jsonEnabled()) {
      const progressFormatter: ProgressFormatter = env.getBoolean('SFDX_USE_PROGRESS_BAR', true)
        ? new DeployProgressBarFormatter(new Ux({ jsonEnabled: this.jsonEnabled() }))
        : new DeployProgressStatusFormatter(new Ux({ jsonEnabled: this.jsonEnabled() }));
      progressFormatter.progress(deploy);
    }

    try {
      this.displayDeployId(deployId);
      this.deployResult = await deploy.pollStatus({ frequency: Duration.milliseconds(500), timeout: waitDuration });
    } catch (error) {
      if (error instanceof Error && error.message.includes('The client has timed out')) {
        this.debug('mdapi:deploy:report polling timed out. Requesting status...');
        this.deployResult = await this.report(this.org.getConnection(), deployId);
      } else {
        throw error;
      }
    }
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
      new Ux({ jsonEnabled: this.jsonEnabled() }),
      {
        concise: this.flags.concise ?? false,
        verbose: this.flags.verbose ?? false,
        coverageOptions: getCoverageFormattersOptions(this.flags.coverageformatters),
        junitTestResults: this.flags.junit ?? false,
        resultsDir: this.resultsDir,
        testsRan: !!this.deployResult?.response?.numberTestsTotal,
      },
      this.deployResult
    );

    this.maybeCreateRequestedReports({
      coverageformatters: this.flags.coverageformatters,
      junit: this.flags.junit,
      org: this.org,
    });

    // Only display results to console when JSON flag is unset.
    if (!this.jsonEnabled()) {
      formatter.display(true);
    }

    return formatter.getJson();
  }
}
