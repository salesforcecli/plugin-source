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
import { DeployCommand, getVersionMessage, TestLevel } from '../../../../deployCommand';
import {
  DeployAsyncResultFormatter,
  DeployCommandAsyncResult,
} from '../../../../formatters/deployAsyncResultFormatter';
import { MdDeployResultFormatter, MdDeployResult } from '../../../../formatters/mdDeployResultFormatter';
import { ProgressFormatter } from '../../../../formatters/progressFormatter';
import { DeployProgressBarFormatter } from '../../../../formatters/deployProgressBarFormatter';
import { DeployProgressStatusFormatter } from '../../../../formatters/deployProgressStatusFormatter';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'md.deploy');

const xorFlags = ['zipfile', 'validateddeployrequestid', 'deploydir'];
export class Deploy extends DeployCommand {
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
      default: 'NoTestRun',
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
  };

  public async run(): Promise<MdDeployResult | DeployCommandAsyncResult> {
    await this.deploy();
    this.resolveSuccess();
    return this.formatResult();
  }

  protected async deploy(): Promise<void> {
    const waitDuration = this.getFlag<Duration>('wait');
    this.isAsync = waitDuration.quantity === 0;
    this.isRest = await this.isRestDeploy();

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
        ignoreWarnings: this.getFlag('ignorewarnings', false),
        rollbackOnError: !this.getFlag('ignoreerrors', false),
        checkOnly: this.getFlag('checkonly', false),
        runTests: this.getFlag<string[]>('runtests'),
        testLevel: this.getFlag<TestLevel>('testlevel'),
        singlePackage: this.getFlag('singlepackage', false),
        rest: this.isRest,
      },
    });
    await deploy.start();
    this.asyncDeployResult = { id: deploy.id };
    this.updateDeployId(deploy.id);

    // we might not know the source api version without unzipping a zip file, so we don't use componentSet
    this.ux.log(getVersionMessage('Deploying', undefined, this.isRest));
    this.logger.debug('Deploy result: %o', deploy);

    if (!this.isAsync) {
      if (!this.isJsonOutput()) {
        const progressFormatter: ProgressFormatter = env.getBoolean('SFDX_USE_PROGRESS_BAR', true)
          ? new DeployProgressBarFormatter(this.logger, this.ux)
          : new DeployProgressStatusFormatter(this.logger, this.ux);
        progressFormatter.progress(deploy);
      }
      this.displayDeployId(deploy.id);
      this.deployResult = await deploy.pollStatus(500, waitDuration.seconds);
    }
  }

  protected formatResult(): MdDeployResult | DeployCommandAsyncResult {
    const formatterOptions = {
      verbose: this.getFlag<boolean>('verbose', false),
    };
    const formatter = this.isAsync
      ? new DeployAsyncResultFormatter(this.logger, this.ux, formatterOptions, this.asyncDeployResult)
      : new MdDeployResultFormatter(this.logger, this.ux, formatterOptions, this.deployResult);

    // Only display results to console when JSON flag is unset.
    if (!this.isJsonOutput()) {
      formatter.display();
    }

    return formatter.getJson();
  }
}
