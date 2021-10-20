/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { FlagsConfig, flags } from '@salesforce/command';
import { Duration, env } from '@salesforce/kit';
import { Messages } from '@salesforce/core';
import { RequestStatus, ComponentStatus } from '@salesforce/source-deploy-retrieve';

// TODO: move to plugin-source
import { SourceTracking, throwIfInvalid, replaceRenamedCommands } from '@salesforce/source-tracking';
import { DeployCommand } from '../../../../deployCommand';
import { DeployResultFormatter, DeployCommandResult } from '../../../../formatters/deployResultFormatter';
import { ProgressFormatter } from '../../../../formatters/progressFormatter';
import { DeployProgressBarFormatter } from '../../../../formatters/deployProgressBarFormatter';
import { DeployProgressStatusFormatter } from '../../../../formatters/deployProgressStatusFormatter';
import { processConflicts } from '../../../../formatters/conflicts';

Messages.importMessagesDirectory(__dirname);
const messages: Messages = Messages.loadMessages('@salesforce/plugin-source', 'push');

export default class SourcePush extends DeployCommand {
  public static description = messages.getMessage('description');
  public static help = messages.getMessage('help');
  protected static readonly flagsConfig: FlagsConfig = {
    forceoverwrite: flags.boolean({
      char: 'f',
      description: messages.getMessage('flags.forceoverwrite'),
      longDescription: messages.getMessage('flags.forceoverwriteLong'),
    }),
    // TODO: use shared flags from plugin-source?
    wait: flags.minutes({
      char: 'w',
      default: Duration.minutes(33),
      min: Duration.minutes(1),
      description: messages.getMessage('flags.waitLong'),
      longDescription: messages.getMessage('flags.waitLong'),
    }),
    ignorewarnings: flags.boolean({
      char: 'g',
      description: messages.getMessage('flags.ignorewarnings'),
      longDescription: messages.getMessage('flags.ignorewarningsLong'),
    }),
  };
  protected static requiresUsername = true;
  protected static requiresProject = true;
  protected readonly lifecycleEventNames = ['predeploy', 'postdeploy'];
  protected hidden = true;

  private isRest = false;

  public async run(): Promise<DeployCommandResult> {
    await this.deploy();
    this.resolveSuccess();
    return this.formatResult();
  }

  protected async deploy(): Promise<void> {
    throwIfInvalid({
      org: this.org,
      projectPath: this.project.getPath(),
      toValidate: 'plugin-source',
      command: replaceRenamedCommands('force:source:push'),
    });
    const waitDuration = this.getFlag<Duration>('wait');
    this.isRest = await this.isRestDeploy();

    const tracking = await SourceTracking.create({
      org: this.org,
      project: this.project,
      apiVersion: this.flags.apiversion as string,
    });
    if (!this.flags.forceoverwrite) {
      processConflicts(await tracking.getConflicts(), this.ux, messages.getMessage('conflictMsg'));
    }
    const componentSet = await tracking.localChangesAsComponentSet();

    // there might have been components in local tracking, but they might be ignored by SDR or unresolvable.
    // SDR will throw when you try to resolve them, so don't
    if (componentSet.size === 0) {
      this.logger.warn('There are no changes to deploy');
      return;
    }

    // fire predeploy event for sync and async deploys
    await this.lifecycle.emit('predeploy', componentSet.toArray());
    this.ux.log(`*** Deploying with ${this.isRest ? 'REST' : 'SOAP'} API ***`);

    const deploy = await componentSet.deploy({
      usernameOrConnection: this.org.getUsername(),
      apiOptions: {
        ignoreWarnings: (this.flags.ignoreWarnings as boolean) || false,
        rest: this.isRest,
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
    this.deployResult = await deploy.pollStatus(500, waitDuration.seconds);

    const successes = this.deployResult
      .getFileResponses()
      .filter((fileResponse) => fileResponse.state !== ComponentStatus.Failed);
    const successNonDeletes = successes.filter((fileResponse) => fileResponse.state !== ComponentStatus.Deleted);
    const successDeletes = successes.filter((fileResponse) => fileResponse.state === ComponentStatus.Deleted);

    await Promise.all([
      // Only fire the postdeploy event when we have results. I.e., not async.
      this.deployResult ? this.lifecycle.emit('postdeploy', this.deployResult) : Promise.resolve(),
      tracking.updateLocalTracking({
        files: successNonDeletes.map((fileResponse) => fileResponse.filePath),
        deletedFiles: successDeletes.map((fileResponse) => fileResponse.filePath),
      }),
      tracking.updateRemoteTracking(successes),
    ]);
  }

  protected resolveSuccess(): void {
    // there might not be a deployResult if we exited early with an empty componentSet
    if (this.deployResult && this.deployResult.response.status !== RequestStatus.Succeeded) {
      this.setExitCode(1);
    }
  }

  protected formatResult(): DeployCommandResult {
    if (!this.deployResult) {
      this.ux.log('No results found');
    }
    const formatterOptions = {
      verbose: this.getFlag<boolean>('verbose', false),
    };

    const formatter = new DeployResultFormatter(this.logger, this.ux, formatterOptions, this.deployResult);

    // Only display results to console when JSON flag is unset.
    if (!this.isJsonOutput()) {
      formatter.display();
    }

    return formatter.getJson();
  }
}
