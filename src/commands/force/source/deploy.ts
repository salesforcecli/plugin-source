/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as os from 'os';
import { flags, FlagsConfig } from '@salesforce/command';
import { Lifecycle, Messages } from '@salesforce/core';
import { DeployResult, MetadataApiDeploy } from '@salesforce/source-deploy-retrieve';
import { Duration } from '@salesforce/kit';
import { asString, asArray, getBoolean, isString } from '@salesforce/ts-types';
import { env } from '@salesforce/kit';
import { DeployCommand } from '../../../deployCommand';
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

  public async run(): Promise<DeployCommandResult | DeployCommandAsyncResult> {
    let deployResult: DeployResult;

    this.isAsync = (this.flags.wait as Duration).quantity === 0;

    const hookEmitter = Lifecycle.getInstance();

    if (this.flags.validateddeployrequestid) {
      deployResult = await this.deployRecentValidation();
    } else if (this.isAsync) {
      // This is an async deploy.  We just kick off the request.
      throw Error('ASYNC DEPLOYS NOT IMPLEMENTED YET');
    } else {
      const cs = await this.createComponentSet({
        sourcepath: asArray<string>(this.flags.sourcepath),
        manifest: asString(this.flags.manifest),
        metadata: asArray<string>(this.flags.metadata),
        apiversion: asString(this.flags.apiversion),
      });

      await hookEmitter.emit('predeploy', { packageXmlPath: cs.getPackageXml() });

      const deploy = cs.deploy({
        usernameOrConnection: this.org.getUsername(),
        apiOptions: {
          ignoreWarnings: getBoolean(this.flags, 'ignorewarnings', false),
          rollbackOnError: !getBoolean(this.flags, 'ignoreerrors', false),
          checkOnly: getBoolean(this.flags, 'checkonly', false),
          runTests: asArray<string>(this.flags.runtests),
          testLevel: this.flags.testlevel as TestLevel,
        },
      });

      // if SFDX_USE_PROGRESS_BAR is unset or true (default true) AND we're not print JSON output
      if (env.getBoolean('SFDX_USE_PROGRESS_BAR', true) && !this.isJsonOutput()) {
        this.initProgressBar();
        this.progress(deploy);
      }

      deployResult = await deploy.start();
    }

    await hookEmitter.emit('postdeploy', deployResult);

    // console.dir(deployResult);

    if (deployResult.response?.id) {
      this.displayDeployId(deployResult.response.id);
      const file = this.getStash();
      this.logger.debug(`Stashing deploy ID: ${deployResult.response.id}`);
      await file.write({ [DeployCommand.STASH_KEY]: { jobid: deployResult.response.id } });
    }

    return this.formatResult(deployResult);
  }

  private async deployRecentValidation(): Promise<DeployResult> {
    const conn = this.org.getConnection();
    const id = asString(this.flags.validateddeployrequestid);
    const rest = await this.isRestDeploy();

    // TODO: This is an async call so we need to poll unless `--wait 0`
    //       See mdapiCheckStatusApi.ts in toolbelt for a polling impl,
    //       although if we end up adding polling code in this plugin
    //       it should be a simpler solution.
    const response = await conn.deployRecentValidation({ id, rest });

    if (!this.isAsync) {
      // Remove this and add polling if we need to poll in the plugin.
      throw Error('deployRecentValidation polling not yet implemented');
    }

    // This is the deploy ID of the deployRecentValidation response, not
    // the already validated deploy ID (i.e., validateddeployrequestid).
    let validatedDeployId: string;
    if (isString(response)) {
      // SOAP API
      validatedDeployId = response;
    } else {
      // REST API
      validatedDeployId = (response as { id: string }).id;
    }

    return this.deployReport(validatedDeployId);
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

    deploy.onError(() => {
      this.progressBar.stop();
    });
  }

  private formatResult(deployResult: DeployResult): DeployCommandResult | DeployCommandAsyncResult {
    // console.dir(deployResult);

    const formatterOptions = {
      verbose: getBoolean(this.flags, 'verbose', false),
      async: this.isAsync,
    };
    const formatter = new DeployResultFormatter(this.logger, this.ux, deployResult, formatterOptions);

    // Only display results to console when JSON flag is unset.
    if (!this.isJsonOutput()) {
      formatter.display();
    }

    return formatter.getJson();
  }
}
