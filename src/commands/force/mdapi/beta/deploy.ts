/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { Stream } from 'stream';
import { flags, FlagsConfig } from '@salesforce/command';
import { Duration, once, env } from '@salesforce/kit';
import { Messages, fs } from '@salesforce/core';
import { create as createArchive } from 'archiver';
import { AsyncResult, DeployResult, RequestStatus } from '@salesforce/source-deploy-retrieve';
import { isString } from '@salesforce/ts-types';
import { DeployCommand, getVersionMessage } from '../../../../deployCommand';
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

export class Deploy extends DeployCommand {
  public static readonly description = messages.getMessage('description');
  // TODO: change help into examples?
  // public static readonly examples = messages.getMessage('examples').split(os.EOL);
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
      exactlyOne: ['zipfile', 'validateddeployrequestid'],
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
      exactlyOne: ['zipfile', 'deploydir'],
      exclusive: ['testlevel', 'runtests', 'ignoreerrors', 'ignorewarnings', 'checkonly'],
    }),
    verbose: flags.builtin({
      description: messages.getMessage('flags.verbose'),
      longDescription: messages.getMessage('flagsLong.verbose'),
    }),
    zipfile: flags.filepath({
      char: 'f',
      description: messages.getMessage('flags.zipFile'),
      longDescription: messages.getMessage('flagsLong.zipFile'),
      exactlyOne: ['validateddeployrequestid', 'deploydir'],
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
  private isAsync = false;
  private isRest = false;
  private asyncDeployResult: AsyncResult;

  private updateDeployId = once((id: string) => {
    this.displayDeployId(id);
    this.setStash(id);
  });

  public async run(): Promise<MdDeployResult | DeployCommandAsyncResult> {
    // start deploy with zip if not already an ID
    // report on that ID
    await this.deploy();
    this.resolveSuccess();
    return this.formatResult();
  }

  protected async deploy(): Promise<void> {
    const waitDuration = this.getFlag<Duration>('wait');
    this.isAsync = waitDuration.quantity === 0;

    if (this.flags.validateddeployrequestid) {
      this.deployResult = await this.deployRecentValidation();
      return;
    }
    // still here?  we need to deploy a zip file then
    const zipBuffer = await this.getZipBuffer();

    // we might not know the source api version without unzipping a zip file, so we don't use componentSet
    this.ux.log(getVersionMessage('Deploying', undefined, this.isRest));
    this.asyncDeployResult = await this.org.getConnection().deploy(zipBuffer, {
      rest: await this.isRestDeploy(),
      checkOnly: this.getFlag('checkonly', false),
      ignoreWarnings: this.getFlag('ignorewarnings', false),
      rollbackOnError: !this.getFlag('ignoreerrors', false),
      singlePackage: this.getFlag('singlepackage', false),
      runTests: this.getFlag<string[]>('runtests'),
    });
    this.logger.debug('Deploy result: %o', this.asyncDeployResult);
    this.updateDeployId(this.asyncDeployResult.id);

    if (!this.isAsync) {
      const deploy = this.createDeploy(this.asyncDeployResult.id);
      if (!this.isJsonOutput()) {
        const progressFormatter: ProgressFormatter = env.getBoolean('SFDX_USE_PROGRESS_BAR', true)
          ? new DeployProgressBarFormatter(this.logger, this.ux)
          : new DeployProgressStatusFormatter(this.logger, this.ux);
        progressFormatter.progress(deploy);
      }
      this.displayDeployId(this.asyncDeployResult.id);
      this.deployResult = await deploy.pollStatus(500, waitDuration.seconds);
      // this.deployResult = await this.report(this.asyncDeployResult.id);
    }
  }

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
    if (!this.isAsync) {
      this.setExitCode(StatusCodeMap.get(this.deployResult.response?.status) ?? 1);
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

  /**
   * If deploydir, this creates a zip file from that directory and turns it into a buffer
   * If zipfile, this returns the zip file as a buffer
   *
   * @returns {Promise<Buffer>}
   */
  private async getZipBuffer(): Promise<Buffer> {
    if (this.flags.deploydir) {
      // make a zip from the deploy directory
      if (!fs.existsSync(this.flags.deploydir) || !fs.lstatSync(this.flags.deploydir).isDirectory()) {
        throw new Error(`Deploy directory ${this.flags.deploydir as string} does not exist or is not a directory`);
      }
      const zip = createArchive('zip', { zlib: { level: 9 } });
      // anywhere not at the root level is fine
      zip.directory(this.flags.deploydir as string, 'zip');
      await zip.finalize();
      return stream2buffer(zip);
    }
    // read the zip into a buffer
    if (!fs.existsSync(this.flags.zipfile)) {
      throw new Error(`Zip file ${this.flags.zipfile as string} does not exist`);
    }
    // does encoding matter for zip files? I don't know
    return fs.readFile(this.flags.zipfile as string);
  }
  // TODO: move this into a shared function OR DeployCommand
  private async deployRecentValidation(): Promise<DeployResult> {
    const conn = this.org.getConnection();
    const id = this.getFlag<string>('validateddeployrequestid');

    const response = await conn.deployRecentValidation({ id, rest: this.isRest });

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
    this.updateDeployId(validatedDeployId);

    return this.isAsync ? this.report(validatedDeployId) : this.poll(validatedDeployId);
  }
}

const stream2buffer = async (stream: Stream): Promise<Buffer> => {
  return new Promise<Buffer>((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buf = Array<any>();

    stream.on('data', (chunk) => buf.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(buf)));
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    stream.on('error', (err) => reject(`error converting stream - ${err}`));
  });
};
