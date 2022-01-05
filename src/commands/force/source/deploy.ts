/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as os from 'os';
import { flags, FlagsConfig } from '@salesforce/command';
import { Messages } from '@salesforce/core';
import { AsyncResult } from '@salesforce/source-deploy-retrieve';
import { Duration, env } from '@salesforce/kit';
import { DeployCommand, getVersionMessage, TestLevel } from '../../../deployCommand';
import { ComponentSetBuilder } from '../../../componentSetBuilder';
import { DeployCommandResult, DeployResultFormatter } from '../../../formatters/deployResultFormatter';
import { DeployAsyncResultFormatter, DeployCommandAsyncResult } from '../../../formatters/deployAsyncResultFormatter';
import { ProgressFormatter } from '../../../formatters/progressFormatter';
import { DeployProgressBarFormatter } from '../../../formatters/deployProgressBarFormatter';
import { DeployProgressStatusFormatter } from '../../../formatters/deployProgressStatusFormatter';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'deploy');

// One of these flags must be specified for a valid deploy.
const xorFlags = ['manifest', 'metadata', 'sourcepath', 'validateddeployrequestid'];

export class Deploy extends DeployCommand {
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessage('examples').split(os.EOL);
  public static readonly requiresProject = true;
  public static readonly requiresUsername = true;
  public static readonly flagsConfig: FlagsConfig = {
    checkonly: flags.boolean({
      char: 'c',
      description: messages.getMessage('flags.checkonly'),
      longDescription: messages.getMessage('flagsLong.checkonly'),
    }),
    soapdeploy: flags.boolean({
      default: false,
      description: messages.getMessage('flags.soapDeploy'),
    }),
    wait: flags.minutes({
      char: 'w',
      default: Duration.minutes(Deploy.DEFAULT_WAIT_MINUTES),
      min: Duration.minutes(0), // wait=0 means deploy is asynchronous
      description: messages.getMessage('flags.wait'),
      longDescription: messages.getMessage('flagsLong.wait'),
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
      description: messages.getMessage('flags.validateDeployRequestId'),
      longDescription: messages.getMessage('flagsLong.validateDeployRequestId'),
      exactlyOne: xorFlags,
      exclusive: ['checkonly', 'testlevel', 'runtests', 'ignoreerrors', 'ignorewarnings'],
      validate: DeployCommand.isValidDeployId,
    }),
    verbose: flags.builtin({
      description: messages.getMessage('flags.verbose'),
    }),
    metadata: flags.array({
      char: 'm',
      description: messages.getMessage('flags.metadata'),
      longDescription: messages.getMessage('flagsLong.metadata'),
      exactlyOne: xorFlags,
    }),
    sourcepath: flags.array({
      char: 'p',
      description: messages.getMessage('flags.sourcePath'),
      longDescription: messages.getMessage('flagsLong.sourcePath'),
      exactlyOne: xorFlags,
    }),
    manifest: flags.filepath({
      char: 'x',
      description: messages.getMessage('flags.manifest'),
      longDescription: messages.getMessage('flagsLong.manifest'),
      exactlyOne: xorFlags,
    }),
    predestructivechanges: flags.filepath({
      description: messages.getMessage('flags.predestructivechanges'),
      dependsOn: ['manifest'],
    }),
    postdestructivechanges: flags.filepath({
      description: messages.getMessage('flags.postdestructivechanges'),
      dependsOn: ['manifest'],
    }),
  };
  protected readonly lifecycleEventNames = ['predeploy', 'postdeploy'];

  private asyncDeployResult: AsyncResult;

  public async run(): Promise<DeployCommandResult | DeployCommandAsyncResult> {
    await this.deploy();
    this.resolveSuccess();
    return this.formatResult();
  }

  // There are 3 types of deploys:
  //   1. synchronous - deploy metadata and wait for the deploy to complete.
  //   2. asynchronous - deploy metadata and immediately return.
  //   3. recent validation - deploy metadata that's already been validated by the org
  protected async deploy(): Promise<void> {
    const waitDuration = this.getFlag<Duration>('wait');
    this.isAsync = waitDuration.quantity === 0;
    this.isRest = await this.isRestDeploy();

    if (this.flags.validateddeployrequestid) {
      this.deployResult = await this.deployRecentValidation();
    } else {
      this.componentSet = await ComponentSetBuilder.build({
        apiversion: this.getFlag<string>('apiversion'),
        sourceapiversion: await this.getSourceApiVersion(),
        sourcepath: this.getFlag<string[]>('sourcepath'),
        manifest: this.flags.manifest && {
          manifestPath: this.getFlag<string>('manifest'),
          directoryPaths: this.getPackageDirs(),
          destructiveChangesPre: this.getFlag<string>('predestructivechanges'),
          destructiveChangesPost: this.getFlag<string>('postdestructivechanges'),
        },
        metadata: this.flags.metadata && {
          metadataEntries: this.getFlag<string[]>('metadata'),
          directoryPaths: this.getPackageDirs(),
        },
      });
      // fire predeploy event for sync and async deploys
      await this.lifecycle.emit('predeploy', this.componentSet.toArray());
      this.ux.log(getVersionMessage('Deploying', this.componentSet, this.isRest));

      const deploy = await this.componentSet.deploy({
        usernameOrConnection: this.org.getUsername(),
        apiOptions: {
          ignoreWarnings: this.getFlag<boolean>('ignorewarnings', false),
          rollbackOnError: !this.getFlag<boolean>('ignoreerrors', false),
          checkOnly: this.getFlag<boolean>('checkonly', false),
          runTests: this.getFlag<string[]>('runtests'),
          testLevel: this.getFlag<TestLevel>('testlevel'),
          rest: this.isRest,
        },
      });
      this.asyncDeployResult = { id: deploy.id };
      this.updateDeployId(deploy.id);

      if (!this.isAsync) {
        // we're not print JSON output
        if (!this.isJsonOutput()) {
          const progressFormatter: ProgressFormatter = env.getBoolean('SFDX_USE_PROGRESS_BAR', true)
            ? new DeployProgressBarFormatter(this.logger, this.ux)
            : new DeployProgressStatusFormatter(this.logger, this.ux);
          progressFormatter.progress(deploy);
        }
        this.deployResult = await deploy.pollStatus(500, waitDuration.seconds);
      }
    }

    if (this.deployResult) {
      // Only fire the postdeploy event when we have results. I.e., not async.
      await this.lifecycle.emit('postdeploy', this.deployResult);
    }
  }

  protected formatResult(): DeployCommandResult | DeployCommandAsyncResult {
    const formatterOptions = {
      verbose: this.getFlag<boolean>('verbose', false),
    };

    const formatter = this.isAsync
      ? new DeployAsyncResultFormatter(this.logger, this.ux, formatterOptions, this.asyncDeployResult)
      : new DeployResultFormatter(this.logger, this.ux, formatterOptions, this.deployResult);

    // Only display results to console when JSON flag is unset.
    if (!this.isJsonOutput()) {
      formatter.display();
    }

    return formatter.getJson();
  }
}
