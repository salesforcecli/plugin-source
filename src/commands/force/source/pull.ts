/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */



import { Duration } from '@salesforce/kit';
import { Lifecycle, Messages } from '@salesforce/core';
import { FileResponse, RequestStatus, RetrieveVersionData, RetrieveResult } from '@salesforce/source-deploy-retrieve';
import { SourceTracking } from '@salesforce/source-tracking';
import { Interfaces } from '@oclif/core';
import {
  Flags,
  loglevel,
  orgApiVersionFlagWithDeprecations,
  requiredOrgFlagWithDeprecations,
  Ux,
} from '@salesforce/sf-plugins-core';
import { SourceCommand } from '../../../sourceCommand.js';
import { PullResponse, PullResultFormatter } from '../../../formatters/source/pullFormatter.js';
import { trackingSetup, updateTracking } from '../../../trackingFunctions.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url)
const messages = Messages.loadMessages('@salesforce/plugin-source', 'pull');
const retrieveMessages = Messages.loadMessages('@salesforce/plugin-source', 'retrieve');

const replacement = 'project retrieve start';

export default class Pull extends SourceCommand {
  public static readonly state = 'deprecated';
  public static readonly deprecationOptions = {
    to: replacement,
    message: messages.getMessage('deprecation', [replacement]),
  };
  public static description = messages.getMessage('description');
  public static summary = messages.getMessage('summary');
  public static examples = messages.getMessages('examples');
  public static readonly flags = {
    verbose: Flags.boolean({
      summary: messages.getMessage('flags.verbose.summary'),
    }),
    'api-version': orgApiVersionFlagWithDeprecations,
    loglevel,
    'target-org': requiredOrgFlagWithDeprecations,
    forceoverwrite: Flags.boolean({
      char: 'f',
      summary: messages.getMessage('flags.forceoverwrite.summary'),
    }),
    // TODO: use shared flags from plugin-source
    wait: Flags.duration({
      unit: 'minutes',
      char: 'w',
      default: Duration.minutes(33),
      min: 0, // wait=0 means deploy is asynchronous
      summary: messages.getMessage('flags.wait.summary'),
      description: messages.getMessage('flags.wait.description'),
    }),
  };

  public static requiresProject = true;
  protected readonly lifecycleEventNames = ['preretrieve', 'postretrieve'];
  protected tracking!: SourceTracking;
  protected retrieveResult!: RetrieveResult;
  protected deleteFileResponses!: FileResponse[];
  private flags!: Interfaces.InferredFlags<typeof Pull.flags>;

  public async run(): Promise<PullResponse> {
    this.flags = (await this.parse(Pull)).flags;

    await this.preChecks();
    await this.retrieve();
    // do not parallelize delete and retrieve...we only get to delete IF retrieve was successful
    await this.doDeletes(); // deletes includes its tracking file operations
    await updateTracking({
      result: this.retrieveResult,
      ux: new Ux({ jsonEnabled: this.jsonEnabled() }),
      tracking: this.tracking,
    });
    this.spinner.stop();

    return this.formatResult();
  }

  protected async preChecks(): Promise<void> {
    this.spinner.start('Loading source tracking information');
    this.tracking = await trackingSetup({
      ignoreConflicts: this.flags?.forceoverwrite ?? false,
      org: this.flags['target-org'],
      project: this.project,
      ux: new Ux({ jsonEnabled: this.jsonEnabled() }),
    });
  }

  protected async doDeletes(): Promise<void> {
    this.spinner.status = 'Checking for deletes from the org and updating source tracking files';
    const changesToDelete = await this.tracking.getChanges({
      origin: 'remote',
      state: 'delete',
      format: 'SourceComponent',
    });
    this.deleteFileResponses = await this.tracking?.deleteFilesAndUpdateTracking(changesToDelete);
  }

  protected async retrieve(): Promise<void> {
    const componentSet = await this.tracking.remoteNonDeletesAsComponentSet();

    // if it isn't local, add it as a
    if (componentSet.size === 0) {
      return;
    }
    componentSet.sourceApiVersion = await this.getSourceApiVersion();
    if (this.flags['api-version']) {
      componentSet.apiVersion = this.flags['api-version'];
    }
    const username = this.flags['target-org'].getUsername() as string;
    // eslint-disable-next-line @typescript-eslint/require-await
    Lifecycle.getInstance().on('apiVersionRetrieve', async (apiData: RetrieveVersionData) => {
      this.log(
        retrieveMessages.getMessage('apiVersionMsgDetailed', [
          'Pulling',
          apiData.manifestVersion,
          username,
          apiData.apiVersion,
        ])
      );
    });

    const mdapiRetrieve = await componentSet.retrieve({
      usernameOrConnection: username,
      merge: true,
      output: this.project.getDefaultPackage().fullPath,
    });

    this.spinner.status = 'Retrieving metadata from the org';

    // assume: remote deletes that get deleted locally don't fire hooks?
    await Lifecycle.getInstance().emit('preretrieve', componentSet.toArray());
    this.retrieveResult = await mdapiRetrieve.pollStatus({ timeout: this.flags.wait });

    // Assume: remote deletes that get deleted locally don't fire hooks.
    await Lifecycle.getInstance().emit('postretrieve', this.retrieveResult.getFileResponses());
  }

  protected resolveSuccess(): void {
    const StatusCodeMap = new Map<RequestStatus, number>([
      [RequestStatus.Succeeded, 0],
      [RequestStatus.Canceled, 1],
      [RequestStatus.Failed, 1],
      [RequestStatus.InProgress, 69],
      [RequestStatus.Pending, 69],
      [RequestStatus.Canceling, 69],
    ]);
    // there might not be a retrieveResult if we don't have anything to retrieve
    if (this.retrieveResult?.response.status) {
      this.setExitCode(StatusCodeMap.get(this.retrieveResult.response.status) ?? 1);
    }
  }

  protected formatResult(): PullResponse {
    const formatter = new PullResultFormatter(
      new Ux({ jsonEnabled: this.jsonEnabled() }),
      { verbose: this.flags.verbose ?? false },
      this.retrieveResult,
      this.deleteFileResponses
    );

    // Only display results to console when JSON flag is unset.
    if (!this.jsonEnabled()) {
      formatter.display();
    }

    return formatter.getJson();
  }
}
