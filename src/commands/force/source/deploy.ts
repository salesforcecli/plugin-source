/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as os from 'os';
import { flags, FlagsConfig } from '@salesforce/command';
import { ConfigAggregator, Lifecycle, Messages } from '@salesforce/core';
import { Duration } from '@salesforce/kit';
import { asString, asArray, asNumber, getBoolean, JsonCollection } from '@salesforce/ts-types';
import { DeployResult } from '@salesforce/source-deploy-retrieve';
import { SourceCommand } from '../../../sourceCommand';
import {
  DeployResultFormatter,
  DeployCommandResult,
  DeployCommandAsynResult,
} from '../../../formatters/deployResultFormatter';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'deploy');

export class Deploy extends SourceCommand {
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
      default: Duration.minutes(SourceCommand.DEFAULT_SRC_WAIT_MINUTES),
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

  public async run(): Promise<DeployCommandResult | DeployCommandAsynResult> {
    let deployResult;

    if (this.flags.validateddeployrequestid) {
      deployResult = await this.deployRecentValidation();
    } else if (asNumber(this.flags.wait) === 0) {
      // This is an async deploy.  We just kick off the request.
      throw Error('NOT IMPLEMENTED YET');
    } else {
      const hookEmitter = Lifecycle.getInstance();
      const cs = await this.createComponentSet({
        sourcepath: asArray<string>(this.flags.sourcepath),
        manifest: asString(this.flags.manifest),
        metadata: asArray<string>(this.flags.metadata),
        apiversion: asString(this.flags.apiversion),
      });

      await hookEmitter.emit('predeploy', { packageXmlPath: cs.getPackageXml() });

      deployResult = await cs
        .deploy({
          usernameOrConnection: this.org.getUsername(),
          apiOptions: {
            ignoreWarnings: getBoolean(this.flags, 'ignorewarnings', false),
            rollbackOnError: !getBoolean(this.flags, 'ignoreerrors', false),
            checkOnly: getBoolean(this.flags, 'checkonly', false),
            runTests: asArray<string>(this.flags.runtests),
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            testLevel: this.flags.testlevel,
          },
        })
        .start();
      await hookEmitter.emit('postdeploy', deployResult);
    }

    return this.formatResult(deployResult);
  }

  private async deployRecentValidation(): Promise<JsonCollection> {
    const conn = this.org.getConnection();
    return conn.deployRecentValidation({
      id: asString(this.flags.validateddeployrequestid),
      rest: await this.isRestDeploy(),
    });
  }

  private formatResult(deployResult: DeployResult): DeployCommandResult | DeployCommandAsynResult {
    // console.dir(deployResult);

    const formatterOptions = {
      verbose: !!this.flags.verbose,
      async: asNumber(this.flags.wait) === 0,
    };
    const formatter = new DeployResultFormatter(this.logger, this.ux, deployResult, formatterOptions);

    // Only display results to console when JSON flag is unset.
    if (!this.flags.json) {
      formatter.display();
    }

    return formatter.getJson();
  }

  // REST is the default unless:
  //   1. SOAP is specified with the soapdeploy flag on the command
  //   2. The restDeploy SFDX config setting is explicitly false.
  private async isRestDeploy(): Promise<boolean> {
    if (getBoolean(this.flags, 'soapdeploy') === true) {
      this.logger.debug('soapdeploy flag === true.  Using SOAP');
      return false;
    }

    const aggregator = await ConfigAggregator.create();
    const restDeployConfig = aggregator.getPropertyValue('restDeploy');
    // aggregator property values are returned as strings
    if (restDeployConfig === 'false') {
      this.logger.debug('restDeploy SFDX config === false.  Using SOAP');
      return false;
    } else if (restDeployConfig === 'true') {
      this.logger.debug('restDeploy SFDX config === true.  Using REST');
    } else {
      this.logger.debug('soapdeploy flag unset. restDeploy SFDX config unset.  Defaulting to REST');
    }

    return true;
  }
}
