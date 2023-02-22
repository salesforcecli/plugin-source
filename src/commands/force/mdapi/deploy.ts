/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { Duration, env } from '@salesforce/kit';
import { Lifecycle, Messages, Org } from '@salesforce/core';
import { DeployVersionData, MetadataApiDeploy } from '@salesforce/source-deploy-retrieve';
import {
  Flags,
  loglevel,
  orgApiVersionFlagWithDeprecations,
  requiredOrgFlagWithDeprecations,
  Ux,
} from '@salesforce/sf-plugins-core';
import { Interfaces } from '@oclif/core';
import { DeployCommand, getCoverageFormattersOptions, reportsFormatters, TestLevel } from '../../../deployCommand';
import { DeployCommandAsyncResult } from '../../../formatters/source/deployAsyncResultFormatter';
import { MdDeployResult, MdDeployResultFormatter } from '../../../formatters/mdapi/mdDeployResultFormatter';
import { ProgressFormatter } from '../../../formatters/progressFormatter';
import { DeployProgressBarFormatter } from '../../../formatters/deployProgressBarFormatter';
import { DeployProgressStatusFormatter } from '../../../formatters/deployProgressStatusFormatter';
import { MdDeployAsyncResultFormatter } from '../../../formatters/mdapi/mdDeployAsyncResultFormatter';
import { ResultFormatterOptions } from '../../../formatters/resultFormatter';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'md.deploy');
const deployMessages = Messages.loadMessages('@salesforce/plugin-source', 'deployCommand');

const xorFlags = ['zipfile', 'validateddeployrequestid', 'deploydir'];

export class Deploy extends DeployCommand {
  public static aliases = ['force:mdapi:beta:deploy'];
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly flags = {
    'api-version': orgApiVersionFlagWithDeprecations,
    loglevel,
    'target-org': requiredOrgFlagWithDeprecations,
    checkonly: Flags.boolean({
      char: 'c',
      description: messages.getMessage('flags.checkOnly'),
      summary: messages.getMessage('flagsLong.checkOnly'),
    }),
    deploydir: Flags.directory({
      char: 'd',
      description: messages.getMessage('flags.deployDir'),
      summary: messages.getMessage('flagsLong.deployDir'),
      exactlyOne: xorFlags,
    }),
    wait: Flags.duration({
      char: 'w',
      unit: 'minutes',
      description: messages.getMessage('flags.wait'),
      summary: messages.getMessage('flagsLong.wait'),
      default: Duration.minutes(0),
      min: -1,
    }),
    testlevel: Flags.string({
      char: 'l',
      description: messages.getMessage('flags.testLevel'),
      summary: messages.getMessage('flagsLong.testLevel'),
      options: ['NoTestRun', 'RunSpecifiedTests', 'RunLocalTests', 'RunAllTestsInOrg'],
    }),
    runtests: Flags.string({
      char: 'r',
      multiple: true,
      description: messages.getMessage('flags.runTests'),
      summary: messages.getMessage('flagsLong.runTests'),
    }),
    ignoreerrors: Flags.boolean({
      char: 'o',
      description: messages.getMessage('flags.ignoreErrors'),
      summary: messages.getMessage('flagsLong.ignoreErrors'),
    }),
    ignorewarnings: Flags.boolean({
      char: 'g',
      description: messages.getMessage('flags.ignoreWarnings'),
      summary: messages.getMessage('flagsLong.ignoreWarnings'),
    }),
    validateddeployrequestid: Flags.salesforceId({
      char: 'q',
      length: 'both',
      startsWith: '0Af',
      description: messages.getMessage('flags.validatedDeployRequestId'),
      summary: messages.getMessage('flagsLong.validatedDeployRequestId'),
      exactlyOne: xorFlags,
      exclusive: ['testlevel', 'runtests', 'checkonly'],
    }),
    verbose: Flags.boolean({
      description: messages.getMessage('flags.verbose'),
      summary: messages.getMessage('flagsLong.verbose'),
    }),
    zipfile: Flags.file({
      char: 'f',
      description: messages.getMessage('flags.zipFile'),
      summary: messages.getMessage('flagsLong.zipFile'),
      exactlyOne: xorFlags,
    }),
    singlepackage: Flags.boolean({
      char: 's',
      description: messages.getMessage('flags.singlePackage'),
      summary: messages.getMessage('flagsLong.singlePackage'),
    }),
    soapdeploy: Flags.boolean({
      description: messages.getMessage('flags.soapDeploy'),
      summary: messages.getMessage('flagsLong.soapDeploy'),
    }),
    purgeondelete: Flags.boolean({
      description: messages.getMessage('flags.purgeOnDelete'),
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

  private flags: Interfaces.InferredFlags<typeof Deploy.flags>;
  private org: Org;

  public async run(): Promise<MdDeployResult | DeployCommandAsyncResult> {
    this.flags = (await this.parse(Deploy)).flags;
    await this.deploy();
    this.resolveSuccess();
    return this.formatResult();
  }

  protected async deploy(): Promise<void> {
    const waitFlag = this.flags.wait;
    const waitDuration = waitFlag.minutes === -1 ? Duration.days(7) : waitFlag;

    this.isAsync = waitDuration.quantity === 0;
    this.isRest = this.isRestDeploy();
    if (this.isAsync && (this.flags.coverageformatters || this.flags.junit)) {
      this.warn(messages.getMessage('asyncCoverageJunitWarning'));
    }
    if (this.flags.validateddeployrequestid) {
      this.deployResult = await this.deployRecentValidation(
        this.flags.validateddeployrequestid,
        this.org.getConnection()
      );
      return;
    }
    const deploymentOptions = this.flags.zipfile
      ? { zipPath: this.flags.zipfile }
      : { mdapiPath: this.flags.deploydir };
    const username = this.org.getUsername();

    // still here?  we need to deploy a zip file then
    const deploy = new MetadataApiDeploy({
      usernameOrConnection: username,
      ...deploymentOptions,
      apiOptions: {
        // properties that will always have values
        ...{
          purgeOnDelete: this.flags.purgeondelete ?? false,
          ignoreWarnings: this.flags.ignorewarnings ?? false,
          rollbackOnError: !this.flags.ignoreerrors ?? false,
          checkOnly: this.flags.checkonly ?? false,
          singlePackage: this.flags.singlepackage ?? false,
          rest: this.isRest,
        },
        // if runTests is defaulted as 'NoTestRun' and deploying to prod, you'll get this error
        // https://github.com/forcedotcom/cli/issues/1542
        // add additional properties conditionally
        ...(this.flags.testlevel
          ? {
              testLevel: this.flags.testlevel as TestLevel,
            }
          : {}),
        ...(this.flags.runtests ? { runTests: this.flags.runtests } : {}),
      },
    });

    // eslint-disable-next-line @typescript-eslint/require-await
    Lifecycle.getInstance().on('apiVersionDeploy', async (apiData: DeployVersionData) => {
      this.log(deployMessages.getMessage('apiVersionMsgBasic', [username, apiData.apiVersion, apiData.webService]));
    });
    await deploy.start();
    this.asyncDeployResult = { id: deploy.id };
    this.updateDeployId(deploy.id);

    if (!this.isAsync) {
      if (!this.jsonEnabled()) {
        const progressFormatter: ProgressFormatter = env.getBoolean('SFDX_USE_PROGRESS_BAR', true)
          ? new DeployProgressBarFormatter(new Ux({ jsonEnabled: this.jsonEnabled() }))
          : new DeployProgressStatusFormatter(new Ux({ jsonEnabled: this.jsonEnabled() }));
        progressFormatter.progress(deploy);
      }
      this.displayDeployId(deploy.id);
      this.deployResult = await deploy.pollStatus({ frequency: Duration.milliseconds(500), timeout: waitDuration });
    }
  }

  protected formatResult(): MdDeployResult | DeployCommandAsyncResult {
    this.resultsDir = this.resolveOutputDir(
      this.flags.coverageformatters,
      this.flags.junit,
      this.flags.resultsdir,
      this.deployResult?.response?.id,
      true
    );

    const formatterOptions: ResultFormatterOptions = {
      concise: this.flags.concise ?? false,
      verbose: this.flags.verbose ?? false,
      username: this.org.getUsername(),
      coverageOptions: getCoverageFormattersOptions(this.flags.coverageformatters),
      junitTestResults: this.flags.junit,
      resultsDir: this.resultsDir,
      testsRan: (this.flags.testlevel ?? 'NoTestRun') !== 'NoTestRun',
    };
    const formatter = this.isAsync
      ? new MdDeployAsyncResultFormatter(
          new Ux({ jsonEnabled: this.jsonEnabled() }),
          formatterOptions,
          this.asyncDeployResult
        )
      : new MdDeployResultFormatter(new Ux({ jsonEnabled: this.jsonEnabled() }), formatterOptions, this.deployResult);

    if (!this.isAsync) {
      this.maybeCreateRequestedReports({
        coverageformatters: this.flags.coverageformatters,
        junit: this.flags.junit,
        org: this.org,
      });
    }

    // Only display results to console when JSON flag is unset.
    if (!this.jsonEnabled()) {
      formatter.display();
    }

    return formatter.getJson();
  }
}
