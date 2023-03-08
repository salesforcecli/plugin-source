/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { Messages, Org, SfError } from '@salesforce/core';
import { Duration } from '@salesforce/kit';
import { MetadataApiRetrieve, MetadataApiRetrieveStatus, RetrieveResult } from '@salesforce/source-deploy-retrieve';
import {
  Flags,
  loglevel,
  orgApiVersionFlagWithDeprecations,
  requiredOrgFlagWithDeprecations,
  Ux,
} from '@salesforce/sf-plugins-core';
import { Interfaces } from '@oclif/core';
import { resolveZipFileName, SourceCommand } from '../../../../sourceCommand';
import { Stash, MdRetrieveData } from '../../../../stash';
import {
  RetrieveCommandResult,
  RetrieveCommandAsyncResult,
  RetrieveResultFormatter,
} from '../../../../formatters/mdapi/retrieveResultFormatter';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'md.retrieve');
const spinnerMessages = Messages.loadMessages('@salesforce/plugin-source', 'spinner');
export type ReportCommandResult = RetrieveCommandResult | RetrieveCommandAsyncResult;
export class Report extends SourceCommand {
  public static aliases = ['force:mdapi:beta:retrieve:report'];
  public static readonly deprecateAliases = true;
  public static readonly description = messages.getMessage('reportCmd.description');
  public static readonly examples = messages.getMessages('reportCmd.examples');
  public static readonly state = 'deprecated';
  public static readonly flags = {
    'api-version': orgApiVersionFlagWithDeprecations,
    loglevel,
    'target-org': requiredOrgFlagWithDeprecations,
    // NOTE: this flag is not required because the value is stashed
    // from the force:mdapi:retrieve command.
    retrievetargetdir: Flags.directory({
      char: 'r',
      description: messages.getMessage('flags.retrievetargetdir'),
      summary: messages.getMessage('flagsLong.retrievetargetdir'),
    }),
    jobid: Flags.salesforceId({
      char: 'i',
      description: messages.getMessage('flags.jobid'),
      summary: messages.getMessage('flagsLong.jobid'),
    }),
    zipfilename: Flags.string({
      char: 'n',
      description: messages.getMessage('flags.zipfilename'),
      summary: messages.getMessage('flagsLong.zipfilename'),
    }),
    unzip: Flags.boolean({
      char: 'z',
      description: messages.getMessage('flags.unzip'),
      summary: messages.getMessage('flagsLong.unzip'),
    }),
    wait: Flags.duration({
      char: 'w',
      unit: 'minutes',
      description: messages.getMessage('flags.wait'),
      summary: messages.getMessage('flagsLong.wait'),
      min: -1,
      defaultValue: 1440, // 24 hours is a reasonable default versus -1 (no timeout)
    }),
    verbose: Flags.boolean({
      description: messages.getMessage('flags.verbose'),
      summary: messages.getMessage('flagsLong.verbose'),
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
  private flags: Interfaces.InferredFlags<typeof Report.flags>;
  private org: Org;

  public async run(): Promise<ReportCommandResult> {
    this.flags = (await this.parse(Report)).flags;
    this.org = this.flags['target-org'];

    await this.report();
    this.resolveSuccess();
    return this.formatResult();
  }

  protected async report(): Promise<void> {
    let retrieveId = this.flags.jobid;

    if (!retrieveId) {
      // Get stashed retrieve data
      const mdRetrieveStash = Stash.get<MdRetrieveData>('MDAPI_RETRIEVE');

      // throw if no Retrieve ID in stash either
      if (!mdRetrieveStash?.jobid) {
        throw new SfError(messages.getMessage('MissingRetrieveId'), 'MissingRetrieveId');
      }
      retrieveId = mdRetrieveStash.jobid;
      this.retrieveTargetDir = this.resolveOutputDir(mdRetrieveStash?.retrievetargetdir);
      this.zipFileName = resolveZipFileName(mdRetrieveStash?.zipfilename);
      this.unzip = mdRetrieveStash?.unzip;
    } else {
      this.retrieveTargetDir = this.resolveOutputDir(this.flags.retrievetargetdir);
      this.zipFileName = resolveZipFileName(this.flags.zipfilename);
      this.unzip = this.flags.unzip;
    }

    const waitFlag = this.flags.wait;
    this.wait = waitFlag.minutes === -1 ? Duration.days(7) : waitFlag;

    this.isAsync = this.wait.quantity === 0;

    this.spinner.start(spinnerMessages.getMessage('retrieve.main', [this.org.getUsername()]));

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
      this.spinner.status = spinnerMessages.getMessage('retrieve.polling');
      this.retrieveResult = await this.mdapiRetrieve.pollStatus(1000, this.wait.seconds);
    }

    this.spinner.stop();
  }

  // No-op implementation since any RetrieveResult status would be a success.
  // The only time this command would report an error is if it failed
  // flag parsing or some error during the request, and those are captured
  // by the command framework.
  /* eslint-disable-next-line @typescript-eslint/no-empty-function, class-methods-use-this */
  protected resolveSuccess(): void {}

  protected formatResult(): RetrieveCommandResult | RetrieveCommandAsyncResult {
    if (this.isAsync && !this.retrieveResult) {
      this.log('');
      this.log(`Retrieve Status: ${this.retrieveStatus.status}`);
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
      verbose: this.flags.verbose ?? false,
      retrieveTargetDir: this.retrieveTargetDir,
      zipFileName: this.zipFileName,
      unzip: this.unzip,
    };
    const formatter = new RetrieveResultFormatter(
      new Ux({ jsonEnabled: this.jsonEnabled() }),
      formatterOptions,
      this.retrieveResult
    );

    if (!this.jsonEnabled()) {
      formatter.display();
    }
    return formatter.getJson();
  }

  private resolveOutputDir(dirPath: string): string {
    return this.ensureFlagPath({
      flagName: 'retrievetargetdir',
      path: dirPath,
      type: 'dir',
    });
  }
}
