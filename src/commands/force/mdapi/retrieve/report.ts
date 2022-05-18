/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as os from 'os';
import { extname } from 'path';
import { flags, FlagsConfig } from '@salesforce/command';
import { Messages, SfError } from '@salesforce/core';
import { Duration } from '@salesforce/kit';
import { MetadataApiRetrieve, MetadataApiRetrieveStatus, RetrieveResult } from '@salesforce/source-deploy-retrieve';
import { SourceCommand } from '../../../../sourceCommand';
import { Stash, MdRetrieveData } from '../../../../stash';
import {
  RetrieveCommandResult,
  RetrieveCommandAsyncResult,
  RetrieveResultFormatter,
} from '../../../../formatters/mdapi/retrieveResultFormatter';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'md.retrieve');
const spinnerMessages = Messages.loadMessages('@salesforce/plugin-source', 'spinner');

export class Report extends SourceCommand {
  public static aliases = ['force:mdapi:beta:retrieve:report'];
  public static readonly description = messages.getMessage('reportCmd.description');
  public static readonly examples = messages.getMessage('reportCmd.examples').split(os.EOL);
  public static readonly requiresUsername = true;
  public static readonly flagsConfig: FlagsConfig = {
    // NOTE: this flag is not required because the value is stashed
    // from the force:mdapi:retrieve command.
    retrievetargetdir: flags.directory({
      char: 'r',
      description: messages.getMessage('flags.retrievetargetdir'),
      longDescription: messages.getMessage('flagsLong.retrievetargetdir'),
    }),
    jobid: flags.id({
      char: 'i',
      description: messages.getMessage('flags.jobid'),
      longDescription: messages.getMessage('flagsLong.jobid'),
    }),
    zipfilename: flags.string({
      char: 'n',
      description: messages.getMessage('flags.zipfilename'),
      longDescription: messages.getMessage('flagsLong.zipfilename'),
    }),
    unzip: flags.boolean({
      char: 'z',
      description: messages.getMessage('flags.unzip'),
      longDescription: messages.getMessage('flagsLong.unzip'),
    }),
    wait: flags.minutes({
      char: 'w',
      description: messages.getMessage('flags.wait'),
      longDescription: messages.getMessage('flagsLong.wait'),
      min: -1,
      default: Duration.minutes(1440), // 24 hours is a reasonable default versus -1 (no timeout)
    }),
    verbose: flags.builtin({
      description: messages.getMessage('flags.verbose'),
      longDescription: messages.getMessage('flagsLong.verbose'),
    }),
  };

  protected retrieveResult: RetrieveResult;
  protected retrieveStatus: MetadataApiRetrieveStatus;
  private retrieveTargetDir: string;
  private zipFileName: string;
  private unzip: boolean;
  private wait: Duration;
  private isAsync: boolean;
  private mdapiRetrieve: MetadataApiRetrieve;

  public async run(): Promise<RetrieveCommandResult | RetrieveCommandAsyncResult> {
    await this.report();
    this.resolveSuccess();
    return this.formatResult();
  }

  protected async report(): Promise<void> {
    let retrieveId = this.getFlag<string>('jobid');

    if (!retrieveId) {
      // Get stashed retrieve data
      const mdRetrieveStash = Stash.get<MdRetrieveData>('MDAPI_RETRIEVE');

      // throw if no Retrieve ID in stash either
      if (!mdRetrieveStash?.jobid) {
        throw new SfError(messages.getMessage('MissingRetrieveId'), 'MissingRetrieveId');
      }
      retrieveId = mdRetrieveStash.jobid;
      this.retrieveTargetDir = this.resolveOutputDir(mdRetrieveStash?.retrievetargetdir);
      this.zipFileName = this.resolveZipFileName(mdRetrieveStash?.zipfilename);
      this.unzip = mdRetrieveStash?.unzip;
    } else {
      this.retrieveTargetDir = this.resolveOutputDir(this.getFlag<string>('retrievetargetdir'));
      this.zipFileName = this.resolveZipFileName(this.getFlag<string>('zipfilename'));
      this.unzip = this.getFlag<boolean>('unzip');
    }

    const waitFlag = this.getFlag<Duration>('wait');
    this.wait = waitFlag.minutes === -1 ? Duration.days(7) : waitFlag;

    this.isAsync = this.wait.quantity === 0;

    this.ux.startSpinner(spinnerMessages.getMessage('retrieve.main', [this.org.getUsername()]));

    this.mdapiRetrieve = new MetadataApiRetrieve({
      id: retrieveId,
      usernameOrConnection: this.org.getUsername(),
      output: this.retrieveTargetDir,
      format: 'metadata',
      zipFileName: this.zipFileName,
      unzip: this.unzip,
    });

    if (this.isAsync) {
      // For async reports (wait == 0) we just check the status and call post()
      // to write the zip file if it's done.
      this.retrieveStatus = await this.mdapiRetrieve.checkStatus();
      if (this.retrieveStatus.done) {
        this.retrieveResult = await this.mdapiRetrieve.post(this.retrieveStatus);
      }
    } else {
      this.ux.setSpinnerStatus(spinnerMessages.getMessage('retrieve.polling'));
      this.retrieveResult = await this.mdapiRetrieve.pollStatus(1000, this.wait.seconds);
    }

    this.ux.stopSpinner();
  }

  // No-op implementation since any RetrieveResult status would be a success.
  // The only time this command would report an error is if it failed
  // flag parsing or some error during the request, and those are captured
  // by the command framework.
  /* eslint-disable-next-line @typescript-eslint/no-empty-function */
  protected resolveSuccess(): void {}

  protected formatResult(): RetrieveCommandResult | RetrieveCommandAsyncResult {
    if (this.isAsync && !this.retrieveResult) {
      this.ux.log('');
      this.ux.log(`Retrieve Status: ${this.retrieveStatus.status}`);
      return {
        done: this.retrieveStatus.done,
        id: this.retrieveStatus.id,
        state: this.retrieveStatus.status,
        status: this.retrieveStatus.status,
        timedOut: true,
      } as RetrieveCommandAsyncResult;
    }

    const formatterOptions = {
      waitTime: this.wait.quantity,
      verbose: this.getFlag<boolean>('verbose', false),
      retrieveTargetDir: this.retrieveTargetDir,
      zipFileName: this.zipFileName,
      unzip: this.unzip,
    };
    const formatter = new RetrieveResultFormatter(this.logger, this.ux, formatterOptions, this.retrieveResult);

    if (!this.isJsonOutput()) {
      formatter.display();
    }
    return formatter.getJson();
  }

  private resolveZipFileName(zipFileName?: string): string {
    // If no file extension was provided append, '.zip'
    if (zipFileName && !extname(zipFileName)) {
      zipFileName += '.zip';
    }
    return zipFileName || 'unpackaged.zip';
  }

  private resolveOutputDir(dirPath: string): string {
    return this.ensureFlagPath({
      flagName: 'retrievetargetdir',
      path: dirPath,
      type: 'dir',
    });
  }
}
