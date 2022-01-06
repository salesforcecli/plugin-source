/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { flags, FlagsConfig } from '@salesforce/command';
import { Duration, env } from '@salesforce/kit';
import { Messages } from '@salesforce/core';
import { ComponentStatus, DeployResult, RequestStatus } from '@salesforce/source-deploy-retrieve';

import { replaceRenamedCommands, SourceTracking, throwIfInvalid } from '@salesforce/source-tracking';
import { getBoolean } from '@salesforce/ts-types';
import { DeployCommand, getVersionMessage } from '../../../../deployCommand';
import { PushResponse, PushResultFormatter } from '../../../../formatters/pushResultFormatter';
import { ProgressFormatter } from '../../../../formatters/progressFormatter';
import { DeployProgressBarFormatter } from '../../../../formatters/deployProgressBarFormatter';
import { DeployProgressStatusFormatter } from '../../../../formatters/deployProgressStatusFormatter';
import { processConflicts } from '../../../../formatters/conflicts';

Messages.importMessagesDirectory(__dirname);
const messages: Messages = Messages.loadMessages('@salesforce/plugin-source', 'push');

export default class Push extends DeployCommand {
  public static description = messages.getMessage('description');
  public static help = messages.getMessage('help');
  protected static readonly flagsConfig: FlagsConfig = {
    forceoverwrite: flags.boolean({
      char: 'f',
      description: messages.getMessage('flags.forceoverwrite'),
      longDescription: messages.getMessage('flags.forceoverwriteLong'),
    }),
    wait: flags.minutes({
      char: 'w',
      default: Duration.minutes(DeployCommand.DEFAULT_WAIT_MINUTES),
      min: Duration.minutes(1),
      description: messages.getMessage('flags.waitLong'),
      longDescription: messages.getMessage('flags.waitLong'),
    }),
    ignorewarnings: flags.boolean({
      char: 'g',
      description: messages.getMessage('flags.ignorewarnings'),
      longDescription: messages.getMessage('flags.ignorewarningsLong'),
    }),
    quiet: flags.builtin({
      description: messages.getMessage('flags.quiet'),
    }),
  };
  protected static requiresUsername = true;
  protected static requiresProject = true;
  protected readonly lifecycleEventNames = ['predeploy', 'postdeploy'];

  private deployResults: DeployResult[] = [];
  private tracking: SourceTracking;
  private deletes: string[];

  public async run(): Promise<PushResponse> {
    await this.prechecks();
    await this.deploy();
    this.resolveSuccess();
    await this.updateTrackingFiles();
    return this.formatResult();
  }

  protected async prechecks(): Promise<void> {
    throwIfInvalid({
      org: this.org,
      projectPath: this.project.getPath(),
      toValidate: 'plugin-source',
      command: replaceRenamedCommands('force:source:push'),
    });
    this.tracking = await SourceTracking.create({
      org: this.org,
      project: this.project,
      apiVersion: this.flags.apiversion as string,
    });
    if (!this.flags.forceoverwrite) {
      processConflicts(await this.tracking.getConflicts(), this.ux, messages.getMessage('conflictMsg'));
    }
    // we need these later to show deletes in results
    this.deletes = await this.tracking.getChanges<string>({ origin: 'local', state: 'delete', format: 'string' });
  }

  protected async deploy(): Promise<void> {
    const isSequentialDeploy = getBoolean(
      await this.project.resolveProjectConfig(),
      'pushPackageDirectoriesSequentially',
      false
    );
    const [componentSets, sourceApiVersion, isRest] = await Promise.all([
      this.tracking.localChangesAsComponentSet(isSequentialDeploy),
      this.getSourceApiVersion(),
      this.isRestDeploy(),
    ]);
    for (const componentSet of componentSets) {
      if (sourceApiVersion) {
        componentSet.sourceApiVersion = sourceApiVersion;
      }

      // there might have been components in local tracking, but they might be ignored by SDR or unresolvable.
      // SDR will throw when you try to resolve them, so don't
      if (componentSet.size === 0) {
        this.logger.warn('There are no changes to deploy');
        continue;
      }

      // fire predeploy event for sync and async deploys
      await this.lifecycle.emit('predeploy', componentSet.toArray());

      this.ux.log(getVersionMessage('Pushing', componentSet, isRest));

      const deploy = await componentSet.deploy({
        usernameOrConnection: this.org.getUsername(),
        apiOptions: {
          ignoreWarnings: this.getFlag<boolean>('ignorewarnings', false),
          rest: isRest,
          testLevel: 'NoTestRun',
        },
      });

      // we're not print JSON output
      if (!this.isJsonOutput()) {
        const progressFormatter: ProgressFormatter = env.getBoolean('SFDX_USE_PROGRESS_BAR', true)
          ? new DeployProgressBarFormatter(this.logger, this.ux)
          : new DeployProgressStatusFormatter(this.logger, this.ux);
        progressFormatter.progress(deploy);
      }
      const result = await deploy.pollStatus({ timeout: this.getFlag<Duration>('wait') });

      if (result) {
        // Only fire the postdeploy event when we have results. I.e., not async.
        await this.lifecycle.emit('postdeploy', result);
        this.deployResults.push(result);
        if (
          result.response.status !== RequestStatus.Succeeded &&
          isSequentialDeploy &&
          this.project.hasMultiplePackages()
        ) {
          this.ux.log(messages.getMessage('sequentialFail'));
          break;
        }
      }
    }
  }

  protected async updateTrackingFiles(): Promise<void> {
    if (process.exitCode !== 0 || !this.deployResults.length) {
      return;
    }
    const successes = this.deployResults
      .flatMap((result) => result.getFileResponses())
      .filter((fileResponse) => fileResponse.state !== ComponentStatus.Failed);
    const successNonDeletes = successes.filter((fileResponse) => fileResponse.state !== ComponentStatus.Deleted);
    // deleted bundleMembers might not be in here, but we can get them from tracking files and compare their parent bundle
    const successDeletes = successes.filter((fileResponse) => fileResponse.state === ComponentStatus.Deleted);

    await Promise.all([
      this.tracking.updateLocalTracking({
        files: successNonDeletes.map((fileResponse) => fileResponse.filePath),
        deletedFiles: successDeletes.map((fileResponse) => fileResponse.filePath),
      }),
      this.tracking.updateRemoteTracking(successes),
    ]);
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

    // there might be no results if we exited early (ex: nothing to push)
    if (!this.deployResults.length) {
      return this.setExitCode(0);
    }
    // any incomplete means incomplete
    if (this.deployResults.some((result) => StatusCodeMap.get(result.response.status) === 69)) {
      return this.setExitCode(69);
    }

    const isSuccessLike = (result: DeployResult): boolean => {
      return (
        result.response.status === RequestStatus.Succeeded ||
        // successful-ish  (only warnings about deleted things that are already deleted)
        (result.response.status === RequestStatus.Failed &&
          result.getFileResponses().every((fr) => fr.state !== 'Failed'))
      );
    };
    // all successes
    if (this.deployResults.every((result) => isSuccessLike(result))) {
      return this.setExitCode(0);
    }

    // 1 and 0 === 68 "partial success"
    else if (
      this.deployResults.some((result) => isSuccessLike(result)) &&
      this.deployResults.some((result) => StatusCodeMap.get(result.response.status) === 1)
    ) {
      return this.setExitCode(68);
    }
    this.logger.warn('Unexpected exit code', this.deployResults);
    this.setExitCode(1);
  }

  protected formatResult(): PushResponse {
    if (!this.deployResults.length) {
      this.ux.log('No results found');
    }
    const formatterOptions = {
      quiet: this.getFlag<boolean>('quiet', false),
    };

    const formatter = new PushResultFormatter(this.logger, this.ux, formatterOptions, this.deployResults, this.deletes);

    // Only display results to console when JSON flag is unset.
    if (!this.isJsonOutput()) {
      formatter.display();
    }

    return formatter.getJson();
  }
}
