/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as os from 'os';
import { flags, FlagsConfig } from '@salesforce/command';
import { Messages } from '@salesforce/core';
import { ComponentSet, DeployResult, MetadataApiDeploy } from '@salesforce/source-deploy-retrieve';
import { Duration } from '@salesforce/kit';
import { getString } from '@salesforce/ts-types';
import { env } from '@salesforce/kit';
import { RequestStatus } from '@salesforce/source-deploy-retrieve/lib/src/client/types';
import { DeployCommand } from '../../../deployCommand';
import { ComponentSetBuilder } from '../../../componentSetBuilder';
import {
  DeployResultFormatter,
  DeployCommandResult,
  DeployCommandAsyncResult,
} from '../../../formatters/deployResultFormatter';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'deploy');

type TestLevel = 'NoTestRun' | 'RunSpecifiedTests' | 'RunLocalTests' | 'RunAllTestsInOrg';

export class Deploy extends DeployCommand {
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessage('examples').split(os.EOL);
  public static readonly requiresProject = true;
  public static readonly requiresUsername = true;
  public static readonly flagsConfig: FlagsConfig = {
    checkonly: flags.boolean({
      char: 'c',
      description: messages.getMessage('flags.checkonly'),
    }),
    soapdeploy: flags.boolean({
      default: false,
      description: messages.getMessage('flags.soapDeploy'),
    }),
    wait: flags.minutes({
      char: 'w',
      default: Duration.minutes(Deploy.DEFAULT_SRC_WAIT_MINUTES),
      min: Duration.minutes(0), // wait=0 means deploy is asynchronous
      description: messages.getMessage('flags.wait'),
    }),
    testlevel: flags.enum({
      char: 'l',
      description: messages.getMessage('flags.testLevel'),
      options: ['NoTestRun', 'RunSpecifiedTests', 'RunLocalTests', 'RunAllTestsInOrg'],
      default: 'NoTestRun',
    }),
    runtests: flags.array({
      char: 'r',
      description: messages.getMessage('flags.runTests'),
      default: [],
    }),
    ignoreerrors: flags.boolean({
      char: 'o',
      description: messages.getMessage('flags.ignoreErrors'),
    }),
    ignorewarnings: flags.boolean({
      char: 'g',
      description: messages.getMessage('flags.ignoreWarnings'),
    }),
    validateddeployrequestid: flags.id({
      char: 'q',
      description: messages.getMessage('flags.validateDeployRequestId'),
      exclusive: [
        'manifest',
        'metadata',
        'sourcepath',
        'checkonly',
        'testlevel',
        'runtests',
        'ignoreerrors',
        'ignorewarnings',
      ],
    }),
    verbose: flags.builtin({
      description: messages.getMessage('flags.verbose'),
    }),
    metadata: flags.array({
      char: 'm',
      description: messages.getMessage('flags.metadata'),
      exclusive: ['manifest', 'sourcepath'],
    }),
    sourcepath: flags.array({
      char: 'p',
      description: messages.getMessage('flags.sourcePath'),
      exclusive: ['manifest', 'metadata'],
    }),
    manifest: flags.filepath({
      char: 'x',
      description: messages.getMessage('flags.manifest'),
      exclusive: ['metadata', 'sourcepath'],
    }),
  };
  protected readonly lifecycleEventNames = ['predeploy', 'postdeploy'];

  private isAsync = false;
  private isRest = false;

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
    this.isAsync = this.getFlag<Duration>('wait').quantity === 0;
    this.isRest = await this.isRestDeploy();
    this.ux.log(`*** Deploying with ${this.isRest ? 'REST' : 'SOAP'} API ***`);

    if (this.flags.validateddeployrequestid) {
      this.deployResult = await this.deployRecentValidation();
    } else {
      // the deployment involves a component set
      const cs = await ComponentSetBuilder.build({
        apiversion: this.getFlag<string>('apiversion'),
        sourcepath: this.getFlag<string[]>('sourcepath'),
        manifest: this.flags.manifest && {
          manifestPath: this.getFlag<string>('manifest'),
          directoryPaths: this.getPackageDirs(),
        },
        metadata: this.flags.metadata && {
          metadataEntries: this.getFlag<string[]>('metadata'),
          directoryPaths: this.getPackageDirs(),
        },
      });
      // fire predeploy event for sync and async deploys
      await this.lifecycle.emit('predeploy', cs.toArray());
      if (this.isAsync) {
        // This is an async deploy.  We just kick off the request.
        throw Error('ASYNC DEPLOYS NOT IMPLEMENTED YET');
      } else {
        const deploy = cs.deploy({
          usernameOrConnection: this.org.getUsername(),
          apiOptions: {
            ignoreWarnings: this.getFlag<boolean>('ignorewarnings', false),
            rollbackOnError: !this.getFlag<boolean>('ignoreerrors', false),
            checkOnly: this.getFlag<boolean>('checkonly', false),
            runTests: this.getFlag<string[]>('runtests'),
            testLevel: this.getFlag<TestLevel>('testlevel', 'NoTestRun'),
          },
        });

        // if SFDX_USE_PROGRESS_BAR is unset or true (default true) AND we're not print JSON output
        if (env.getBoolean('SFDX_USE_PROGRESS_BAR', true) && !this.isJsonOutput()) {
          this.initProgressBar();
          this.progress(deploy);
        }

        this.deployResult = await deploy.start();
      }
    }

    await this.lifecycle.emit('postdeploy', this.deployResult);

    const deployId = getString(this.deployResult, 'response.id');
    if (deployId) {
      this.displayDeployId(deployId);
      const file = this.getStash();
      // TODO: I think we should stash the ID as soon as we know it.
      this.logger.debug(`Stashing deploy ID: ${deployId}`);
      await file.write({ [DeployCommand.STASH_KEY]: { jobid: deployId } });
    }
  }

  protected resolveSuccess(): void {
    const status = getString(this.deployResult, 'response.status');
    if (status !== RequestStatus.Succeeded) {
      this.setExitCode(1);
    }
  }

  protected formatResult(): DeployCommandResult | DeployCommandAsyncResult {
    const formatterOptions = {
      verbose: this.getFlag<boolean>('verbose', false),
      async: this.isAsync,
    };
    const formatter = new DeployResultFormatter(this.logger, this.ux, formatterOptions, this.deployResult);

    // Only display results to console when JSON flag is unset.
    if (!this.isJsonOutput()) {
      formatter.display();
    }

    return formatter.getJson();
  }

  private async deployRecentValidation(): Promise<DeployResult> {
    const id = this.getFlag<string>('validateddeployrequestid');

    // const deploy = await MetadataApiDeploy.deployRecentlyValidatedId(id, this.org.getUsername(), this.isRest);
    const deploy = new MetadataApiDeploy({
      id,
      usernameOrConnection: this.org.getUsername(),
      components: new ComponentSet(),
    });
    if (this.isAsync) {
      // TODO: add async messaging with Steve's async deploy changes
      this.ux.log('ASYNC quick deploy in progress');
    } else {
      // TODO: add the sync polling from Steve's PR to SDR
      this.ux.log('SYNC quick deploy in progress');
    }

    // if SFDX_USE_PROGRESS_BAR is unset or true (default true) AND we're not print JSON output
    if (env.getBoolean('SFDX_USE_PROGRESS_BAR', true) && !this.isJsonOutput()) {
      this.initProgressBar();
      this.progress(deploy);
    }
    const validatedDeployId = await deploy.deployRecentValidation(this.isRest);

    return this.report(validatedDeployId);
  }

  private progress(deploy: MetadataApiDeploy): void {
    let started = false;
    deploy.onUpdate((data) => {
      // the numCompTot. isn't computed right away, wait to start until we know how many we have
      if (data.numberComponentsTotal && !started) {
        this.displayDeployId(data.id);
        this.progressBar.start(data.numberComponentsTotal + data.numberTestsTotal);
        started = true;
      }

      // the numTestsTot. isn't computed until validated as tests by the server, update the PB once we know
      if (data.numberTestsTotal) {
        this.progressBar.setTotal(data.numberComponentsTotal + data.numberTestsTotal);
      }

      this.progressBar.update(data.numberComponentsDeployed + data.numberTestsCompleted);
    });

    // any thing else should stop the progress bar
    deploy.onFinish((data) => {
      // the final tick of `onUpdate` is actually fired with `onFinish`
      this.progressBar.update(data.response.numberComponentsDeployed + data.response.numberTestsCompleted);
      this.progressBar.stop();
    });

    deploy.onCancel(() => {
      this.progressBar.stop();
    });

    deploy.onError((error: Error) => {
      this.progressBar.stop();
      throw error;
    });
  }
}
