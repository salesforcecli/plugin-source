/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { flags, FlagsConfig } from '@salesforce/command';
import { Duration } from '@salesforce/kit';
import { Messages } from '@salesforce/core';
import {
  ComponentSet,
  FileResponse,
  RequestStatus,
  RetrieveResult,
  SourceComponent,
} from '@salesforce/source-deploy-retrieve';
import { ChangeResult, replaceRenamedCommands, SourceTracking } from '@salesforce/source-tracking';
import { SourceCommand } from '../../../../sourceCommand';
import { PullResponse, PullResultFormatter } from '../../../../formatters/source/pullFormatter';
import { updateTracking, trackingSetup } from '../../../../trackingFunctions';

Messages.importMessagesDirectory(__dirname);
const messages: Messages = Messages.loadMessages('@salesforce/plugin-source', 'pull');

export default class Pull extends SourceCommand {
  public static description = messages.getMessage('description');
  public static help = messages.getMessage('help');
  protected static readonly flagsConfig: FlagsConfig = {
    forceoverwrite: flags.boolean({
      char: 'f',
      description: messages.getMessage('flags.forceoverwrite'),
    }),
    // TODO: use shared flags from plugin-source
    wait: flags.minutes({
      char: 'w',
      default: Duration.minutes(33),
      min: Duration.minutes(0), // wait=0 means deploy is asynchronous
      description: messages.getMessage('flags.waitLong'),
    }),
  };

  protected static requiresUsername = true;
  protected static requiresProject = true;
  protected readonly lifecycleEventNames = ['preretrieve', 'postretrieve'];
  protected tracking: SourceTracking;
  protected retrieveResult: RetrieveResult;
  protected deleteFileResponses: FileResponse[];

  public async run(): Promise<PullResponse[]> {
    await this.preChecks();
    await this.retrieve();
    // do not parallelize delete and retrieve...we only get to delete IF retrieve was successful
    await this.doDeletes(); // deletes includes its tracking file operations
    await updateTracking({
      result: this.retrieveResult,
      ux: this.ux,
      tracking: this.tracking,
    });
    this.ux.stopSpinner();

    return this.formatResult();
  }

  protected async preChecks(): Promise<void> {
    this.tracking = await trackingSetup({
      commandName: replaceRenamedCommands('force:source:pull'),
      ignoreConflicts: this.getFlag<boolean>('forceoverwrite', false),
      org: this.org,
      project: this.project,
      ux: this.ux,
    });
  }

  protected async doDeletes(): Promise<void> {
    this.ux.setSpinnerStatus('Checking for deletes from the org and updating source tracking files');
    const changesToDelete = await this.tracking.getChanges<SourceComponent>({
      origin: 'remote',
      state: 'delete',
      format: 'SourceComponent',
    });
    this.deleteFileResponses = await this.tracking.deleteFilesAndUpdateTracking(changesToDelete);
  }

  protected async retrieve(): Promise<void> {
    const componentSet = new ComponentSet();
    (
      await this.tracking.getChanges<ChangeResult>({
        origin: 'remote',
        state: 'nondelete',
        format: 'ChangeResult',
      })
    ).map((component) => {
      if (component.type && component.name) {
        componentSet.add({
          type: component.type,
          fullName: component.name,
        });
      }
    });

    if (componentSet.size === 0) {
      return;
    }
    componentSet.sourceApiVersion = await this.getSourceApiVersion();
    if (this.getFlag<string>('apiversion')) {
      componentSet.apiVersion = this.getFlag<string>('apiversion');
    }

    const mdapiRetrieve = await componentSet.retrieve({
      usernameOrConnection: this.org.getUsername(),
      merge: true,
      output: this.project.getDefaultPackage().fullPath,
    });

    this.ux.setSpinnerStatus('Retrieving metadata from the org');

    // assume: remote deletes that get deleted locally don't fire hooks?
    await this.lifecycle.emit('preretrieve', componentSet.toArray());
    this.retrieveResult = await mdapiRetrieve.pollStatus({ timeout: this.getFlag<Duration>('wait') });

    // Assume: remote deletes that get deleted locally don't fire hooks.
    await this.lifecycle.emit('postretrieve', this.retrieveResult.getFileResponses());
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
    if (this.retrieveResult && this.retrieveResult.response.status) {
      this.setExitCode(StatusCodeMap.get(this.retrieveResult.response.status) ?? 1);
    }
  }

  protected formatResult(): PullResponse[] {
    const formatterOptions = {
      verbose: this.getFlag<boolean>('verbose', false),
    };

    const formatter = new PullResultFormatter(
      this.logger,
      this.ux,
      formatterOptions,
      this.retrieveResult,
      this.deleteFileResponses
    );

    // Only display results to console when JSON flag is unset.
    if (!this.isJsonOutput()) {
      formatter.display();
    }

    return formatter.getJson();
  }
}
