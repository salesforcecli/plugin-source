/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { Messages, SfProject } from '@salesforce/core';

import { Duration, env } from '@salesforce/kit';
import { ComponentSetBuilder } from '@salesforce/source-deploy-retrieve';
import {
  arrayWithDeprecation,
  Flags,
  loglevel,
  orgApiVersionFlagWithDeprecations,
  requiredOrgFlagWithDeprecations,
  Ux,
} from '@salesforce/sf-plugins-core';
import { Interfaces } from '@oclif/core';
import { DeployCommand, getCoverageFormattersOptions, reportsFormatters } from '../../../../deployCommand.js';
import {
  DeployReportCommandResult,
  DeployReportResultFormatter,
} from '../../../../formatters/deployReportResultFormatter.js';
import { ProgressFormatter } from '../../../../formatters/progressFormatter.js';
import { DeployProgressBarFormatter } from '../../../../formatters/deployProgressBarFormatter.js';
import { DeployProgressStatusFormatter } from '../../../../formatters/deployProgressStatusFormatter.js';
import { ResultFormatterOptions } from '../../../../formatters/resultFormatter.js';

Messages.importMessagesDirectory(dirname(fileURLToPath(import.meta.url)));
const messages = Messages.loadMessages('@salesforce/plugin-source', 'report');

const replacement = 'project deploy report';

export class Report extends DeployCommand {
  public static readonly description = messages.getMessage('description');
  public static readonly summary = messages.getMessage('summary');
  public static readonly examples = messages.getMessages('examples');
  public static readonly state = 'deprecated';
  public static readonly deprecationOptions = {
    to: replacement,
    message: messages.getMessage('deprecation', ['project deploy start', replacement]),
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
    verbose: Flags.boolean({
      summary: messages.getMessage('flags.verbose.summary'),
    }),
    resultsdir: Flags.directory({
      summary: messages.getMessage('flags.resultsDir.summary'),
    }),
    coverageformatters: arrayWithDeprecation({
      summary: messages.getMessage('flags.coverageFormatters.summary'),
      options: reportsFormatters,
      helpValue: reportsFormatters.join(','),
    }),
    junit: Flags.boolean({ summary: messages.getMessage('flags.junit.summary') }),
  };
  private flags: Interfaces.InferredFlags<typeof Report.flags>;

  public async run(): Promise<DeployReportCommandResult> {
    this.flags = (await this.parse(Report)).flags;
    await this.doReport();
    this.resolveSuccess();
    return this.formatResult();
  }

  protected async doReport(): Promise<void> {
    const deployId = this.resolveDeployId(this.flags.jobid);

    this.resultsDir = this.resolveOutputDir(
      this.flags.coverageformatters,
      this.flags.junit,
      this.flags.resultsdir,
      deployId,
      false
    );

    // If the verbose flag is set, AND the command was executed from within
    // an SFDX project, we need to build a ComponentSet so we have mapped
    // source file output.
    if (this.flags.verbose) {
      let sourcepath: string[];
      try {
        this.project = await SfProject.resolve();
        sourcepath = this.project.getUniquePackageDirectories().map((pDir) => pDir.fullPath);
      } catch (err) {
        // ignore the error. this was just to get improved command output.
      }
      this.componentSet = await ComponentSetBuilder.build({ sourcepath });
    }

    const waitDuration = this.flags.wait;
    const deploy = this.createDeploy(this.flags['target-org'].getConnection(), deployId);
    if (!this.jsonEnabled()) {
      const progressFormatter: ProgressFormatter = env.getBoolean('SF_USE_PROGRESS_BAR', true)
        ? new DeployProgressBarFormatter(new Ux({ jsonEnabled: this.jsonEnabled() }))
        : new DeployProgressStatusFormatter(new Ux({ jsonEnabled: this.jsonEnabled() }));
      progressFormatter.progress(deploy);
    }
    try {
      await deploy.pollStatus({ timeout: waitDuration });
    } catch (error) {
      if (error instanceof Error && error.message.includes('The client has timed out')) {
        this.debug('source:deploy:report polling timed out. Requesting status...');
      } else {
        throw error;
      }
    } finally {
      this.deployResult = await this.report(this.flags['target-org'].getConnection(), deployId);
    }
  }

  // No-op implementation since any DeployResult status would be a success.
  // The only time this command would report an error is if it failed
  // flag parsing or some error during the request, and those are captured
  // by the command framework.
  /* eslint-disable-next-line @typescript-eslint/no-empty-function, class-methods-use-this */
  protected resolveSuccess(): void {}

  protected formatResult(): DeployReportCommandResult {
    const formatterOptions: ResultFormatterOptions = {
      verbose: this.flags.verbose ?? false,
      coverageOptions: getCoverageFormattersOptions(this.flags.coverageformatters),
      junitTestResults: this.flags.junit,
      resultsDir: this.resultsDir,
      testsRan: !!this.deployResult?.response.numberTestsTotal,
    };
    const formatter = new DeployReportResultFormatter(
      new Ux({ jsonEnabled: this.jsonEnabled() }),
      formatterOptions,
      this.deployResult
    );

    this.maybeCreateRequestedReports({
      coverageformatters: this.flags.coverageformatters,
      junit: this.flags.junit,
      org: this.flags['target-org'],
    });

    if (!this.jsonEnabled()) {
      formatter.display();
    }
    return formatter.getJson() as DeployReportCommandResult;
  }
}
