/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { EOL } from 'os';
import { flags, FlagsConfig } from '@salesforce/command';
import { Duration, env } from '@salesforce/kit';
import { Messages } from '@salesforce/core';
import { MetadataApiDeploy } from '@salesforce/source-deploy-retrieve';
import { DeployCommand, getVersionMessage, reportsFormatters, TestLevel } from '../../../deployCommand';
import { DeployCommandAsyncResult } from '../../../formatters/source/deployAsyncResultFormatter';
import { MdDeployResult, MdDeployResultFormatter } from '../../../formatters/mdapi/mdDeployResultFormatter';
import { ProgressFormatter } from '../../../formatters/progressFormatter';
import { DeployProgressBarFormatter } from '../../../formatters/deployProgressBarFormatter';
import { DeployProgressStatusFormatter } from '../../../formatters/deployProgressStatusFormatter';
import { MdDeployAsyncResultFormatter } from '../../../formatters/mdapi/mdDeployAsyncResultFormatter';
import { ResultFormatterOptions } from '../../../formatters/resultFormatter';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'md.deploy');

const xorFlags = ['zipfile', 'validateddeployrequestid', 'deploydir'];

export class Deploy extends DeployCommand {
  public static aliases = ['force:mdapi:beta:deploy'];
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessage('examples').split(EOL);
  public static readonly requiresUsername = true;
  public static readonly flagsConfig: FlagsConfig = {
    checkonly: flags.boolean({
      char: 'c',
      description: messages.getMessage('flags.checkOnly'),
      longDescription: messages.getMessage('flagsLong.checkOnly'),
    }),
    deploydir: flags.directory({
      char: 'd',
      description: messages.getMessage('flags.deployDir'),
      longDescription: messages.getMessage('flagsLong.deployDir'),
      exactlyOne: xorFlags,
    }),
    wait: flags.minutes({
      char: 'w',
      description: messages.getMessage('flags.wait', [0]),
      longDescription: messages.getMessage('flagsLong.wait', [0]),
      default: Duration.minutes(0),
      min: -1,
    }),
    testlevel: flags.enum({
      char: 'l',
      description: messages.getMessage('flags.testLevel'),
      longDescription: messages.getMessage('flagsLong.testLevel'),
      options: ['NoTestRun', 'RunSpecifiedTests', 'RunLocalTests', 'RunAllTestsInOrg'],
    }),
    runtests: flags.array({
      char: 'r',
      description: messages.getMessage('flags.runTests'),
      longDescription: messages.getMessage('flagsLong.runTests'),
      default: [],
    }),
    ignoreerrors: flags.boolean({
      char: 'o',
      description: messages.getMessage('flags.ignoreErrors'),
      longDescription: messages.getMessage('flagsLong.ignoreErrors'),
    }),
    ignorewarnings: flags.boolean({
      char: 'g',
      description: messages.getMessage('flags.ignoreWarnings'),
      longDescription: messages.getMessage('flagsLong.ignoreWarnings'),
    }),
    validateddeployrequestid: flags.id({
      char: 'q',
      description: messages.getMessage('flags.validatedDeployRequestId'),
      longDescription: messages.getMessage('flagsLong.validatedDeployRequestId'),
      exactlyOne: xorFlags,
      exclusive: ['testlevel', 'runtests', 'ignoreerrors', 'ignorewarnings', 'checkonly'],
      validate: DeployCommand.isValidDeployId,
    }),
    verbose: flags.builtin({
      description: messages.getMessage('flags.verbose'),
      longDescription: messages.getMessage('flagsLong.verbose'),
    }),
    zipfile: flags.filepath({
      char: 'f',
      description: messages.getMessage('flags.zipFile'),
      longDescription: messages.getMessage('flagsLong.zipFile'),
      exactlyOne: xorFlags,
    }),
    singlepackage: flags.boolean({
      char: 's',
      description: messages.getMessage('flags.singlePackage'),
      longDescription: messages.getMessage('flagsLong.singlePackage'),
    }),
    soapdeploy: flags.boolean({
      description: messages.getMessage('flags.soapDeploy'),
      longDescription: messages.getMessage('flagsLong.soapDeploy'),
    }),
    purgeondelete: flags.boolean({
      description: messages.getMessage('flags.purgeOnDelete'),
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

  public async run(): Promise<MdDeployResult | DeployCommandAsyncResult> {
    await this.deploy();
    this.resolveSuccess();
    return this.formatResult();
  }

  protected async deploy(): Promise<void> {
    const waitFlag = this.getFlag<Duration>('wait');
    const waitDuration = waitFlag.minutes === -1 ? Duration.days(7) : waitFlag;

    this.isAsync = waitDuration.quantity === 0;
    this.isRest = await this.isRestDeploy();
    if (this.isAsync && (this.flags.coverageformatters || this.flags.junit)) {
      this.warn(messages.getMessage('asyncCoverageJunitWarning'));
    }
    if (this.flags.validateddeployrequestid) {
      this.deployResult = await this.deployRecentValidation();
      return;
    }
    const deploymentOptions = this.flags.zipfile
      ? { zipPath: this.flags.zipfile as string }
      : { mdapiPath: this.flags.deploydir as string };

    // still here?  we need to deploy a zip file then
    const deploy = new MetadataApiDeploy({
      usernameOrConnection: this.org.getUsername(),
      ...deploymentOptions,
      apiOptions: {
        // properties that will always have values
        ...{
          purgeOnDelete: this.getFlag('purgeondelete', false),
          ignoreWarnings: this.getFlag('ignorewarnings', false),
          rollbackOnError: !this.getFlag('ignoreerrors', false),
          checkOnly: this.getFlag('checkonly', false),
          singlePackage: this.getFlag('singlepackage', false),
          rest: this.isRest,
        },
        // if runTests is defaulted as 'NoTestRun' and deploying to prod, you'll get this error
        // https://github.com/forcedotcom/cli/issues/1542
        // add additional properties conditionally ()
        ...(this.getFlag<string>('testlevel') ? { testLevel: this.getFlag<TestLevel>('testlevel') } : {}),
        ...(this.getFlag<string[]>('runtests') ? { runTests: this.getFlag<string[]>('runtests') } : {}),
      },
    });
    await deploy.start();
    this.asyncDeployResult = { id: deploy.id };
    this.updateDeployId(deploy.id);

    // we might not know the source api version without unzipping a zip file, so we don't use componentSet
    this.ux.log(getVersionMessage('Deploying', undefined, this.isRest));

    if (!this.isAsync) {
      if (!this.isJsonOutput()) {
        const progressFormatter: ProgressFormatter = env.getBoolean('SFDX_USE_PROGRESS_BAR', true)
          ? new DeployProgressBarFormatter(this.logger, this.ux)
          : new DeployProgressStatusFormatter(this.logger, this.ux);
        progressFormatter.progress(deploy);
      }
      this.displayDeployId(deploy.id);
      this.deployResult = await deploy.pollStatus({ frequency: Duration.milliseconds(500), timeout: waitDuration });
    }
  }

  protected formatResult(): MdDeployResult | DeployCommandAsyncResult {
    this.resultsDir = this.resolveOutputDir(
      this.getFlag<string[]>('coverageformatters', undefined),
      this.getFlag<boolean>('junit'),
      this.getFlag<string>('resultsdir'),
      this.deployResult?.response?.id,
      true
    );

    const formatterOptions: ResultFormatterOptions = {
      concise: this.getFlag<boolean>('concise', false),
      verbose: this.getFlag<boolean>('verbose', false),
      username: this.org.getUsername(),
      coverageOptions: this.getCoverageFormattersOptions(this.getFlag<string[]>('coverageformatters', undefined)),
      junitTestResults: this.flags.junit as boolean,
      resultsDir: this.resultsDir,
      testsRan: this.getFlag<string>('testlevel', 'NoTestRun') !== 'NoTestRun',
    };
    const formatter = this.isAsync
      ? new MdDeployAsyncResultFormatter(this.logger, this.ux, formatterOptions, this.asyncDeployResult)
      : new MdDeployResultFormatter(this.logger, this.ux, formatterOptions, this.deployResult);

    if (!this.isAsync) {
      this.maybeCreateRequestedReports();
    }

    // Only display results to console when JSON flag is unset.
    if (!this.isJsonOutput()) {
      formatter.display();
    }

    return formatter.getJson();
  }
}
