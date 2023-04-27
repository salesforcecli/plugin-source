/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Duration, env } from '@salesforce/kit';
import { Lifecycle, Messages } from '@salesforce/core';
import { DeployResult, DeployVersionData, RequestStatus } from '@salesforce/source-deploy-retrieve';
import { SourceTracking } from '@salesforce/source-tracking';
import { getBoolean } from '@salesforce/ts-types';
import {
  Flags,
  loglevel,
  orgApiVersionFlagWithDeprecations,
  requiredOrgFlagWithDeprecations,
  Ux,
} from '@salesforce/sf-plugins-core';
import { Interfaces } from '@oclif/core';
import { DeployCommand } from '../../../deployCommand';
import { PushResponse, PushResultFormatter } from '../../../formatters/source/pushResultFormatter';
import { ProgressFormatter } from '../../../formatters/progressFormatter';
import { DeployProgressBarFormatter } from '../../../formatters/deployProgressBarFormatter';
import { DeployProgressStatusFormatter } from '../../../formatters/deployProgressStatusFormatter';
import { trackingSetup, updateTracking } from '../../../trackingFunctions';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'push');
const deployMessages = Messages.loadMessages('@salesforce/plugin-source', 'deployCommand');

const replacement = 'project deploy start';

export default class Push extends DeployCommand {
  public static readonly state = 'deprecated';
  public static readonly deprecationOptions = {
    to: replacement,
    message: messages.getMessage('deprecation', [replacement]),
  };
  public static description = messages.getMessage('description');
  public static summary = messages.getMessage('summary');
  public static examples = messages.getMessages('examples');
  public static requiresProject = true;
  public static readonly flags = {
    'api-version': orgApiVersionFlagWithDeprecations,
    loglevel,
    'target-org': requiredOrgFlagWithDeprecations,
    forceoverwrite: Flags.boolean({
      char: 'f',
      summary: messages.getMessage('flags.forceoverwrite.summary'),
    }),
    wait: Flags.duration({
      unit: 'minutes',
      char: 'w',
      default: Duration.minutes(DeployCommand.DEFAULT_WAIT_MINUTES),
      min: 1,
      description: messages.getMessage('flags.wait.description'),
      summary: messages.getMessage('flags.wait.summary'),
    }),
    ignorewarnings: Flags.boolean({
      char: 'g',
      summary: messages.getMessage('flags.ignorewarnings.summary'),
    }),
    quiet: Flags.boolean({
      summary: messages.getMessage('flags.quiet.summary'),
    }),
  };
  protected readonly lifecycleEventNames = ['predeploy', 'postdeploy'];

  private deployResults: DeployResult[] = [];
  private tracking: SourceTracking;
  private deletes: string[];
  private flags: Interfaces.InferredFlags<typeof Push.flags>;

  public async run(): Promise<PushResponse> {
    this.flags = (await this.parse(Push)).flags;
    await this.prechecks();
    await this.deploy();
    this.resolveSuccess();
    await this.updateTracking();
    return this.formatResult();
  }

  protected async prechecks(): Promise<void> {
    this.tracking = await trackingSetup({
      ignoreConflicts: this.flags.forceoverwrite ?? false,
      org: this.flags['target-org'],
      project: this.project,
      ux: new Ux({ jsonEnabled: this.jsonEnabled() }),
    });

    // we need these later to show deletes in results
    this.deletes = await this.tracking.getChanges<string>({ origin: 'local', state: 'delete', format: 'string' });
  }

  protected async deploy(): Promise<void> {
    const username = this.flags['target-org'].getUsername();
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

    // eslint-disable-next-line @typescript-eslint/require-await
    Lifecycle.getInstance().on('apiVersionDeploy', async (apiData: DeployVersionData) => {
      this.log(
        deployMessages.getMessage('apiVersionMsgDetailed', [
          'Pushing',
          apiData.manifestVersion,
          username,
          apiData.apiVersion,
          apiData.webService,
        ])
      );
    });

    for (const componentSet of componentSets) {
      // intentionally to do this sequentially if there are multiple component sets
      /* eslint-disable no-await-in-loop */

      if (sourceApiVersion) {
        componentSet.sourceApiVersion = sourceApiVersion;
      }

      // there might have been components in local tracking, but they might be ignored by SDR or unresolvable.
      // SDR will throw when you try to resolve them, so don't
      if (componentSet.size === 0) {
        this.warn('There are no changes to deploy');
        continue;
      }

      // fire predeploy event for sync and async deploys
      await Lifecycle.getInstance().emit('predeploy', componentSet.toArray());

      const deploy = await componentSet.deploy({
        usernameOrConnection: username,
        apiOptions: {
          ignoreWarnings: this.flags.ignorewarnings ?? false,
          rest: isRest,
          testLevel: 'NoTestRun',
        },
      });

      // we're not print JSON output
      if (!this.jsonEnabled()) {
        const progressFormatter: ProgressFormatter = env.getBoolean('SFDX_USE_PROGRESS_BAR', true)
          ? new DeployProgressBarFormatter(new Ux({ jsonEnabled: this.jsonEnabled() }))
          : new DeployProgressStatusFormatter(new Ux({ jsonEnabled: this.jsonEnabled() }));
        progressFormatter.progress(deploy);
      }
      const result = await deploy.pollStatus({ timeout: this.flags.wait });

      if (result) {
        // Only fire the postdeploy event when we have results. I.e., not async.
        await Lifecycle.getInstance().emit('postdeploy', result);
        this.deployResults.push(result);
        if (
          result.response.status !== RequestStatus.Succeeded &&
          isSequentialDeploy &&
          this.project.hasMultiplePackages()
        ) {
          this.log(messages.getMessage('sequentialFail'));
          break;
        }
      }
      /* eslint-enable no-await-in-loop */
    }
  }

  protected async updateTracking(): Promise<void> {
    // there can be multiple deploy results for sequential deploys
    if (process.exitCode !== 0 || !this.deployResults.length) {
      return;
    }
    await updateTracking({
      ux: new Ux({ jsonEnabled: this.jsonEnabled() }),
      result: this.deployResults[0], // it doesn't matter which one--it's just used to determine if it's deploy or retrieve
      tracking: this.tracking,
      // since we're going to poll source members, we want them all in one transaction
      fileResponses: this.deployResults.flatMap((result) => result.getFileResponses()),
    });
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

    const isSuccessLike = (result: DeployResult): boolean =>
      result.response.status === RequestStatus.Succeeded ||
      // successful-ish  (only warnings about deleted things that are already deleted)
      (result.response.status === RequestStatus.Failed &&
        result.getFileResponses().every((fr) => fr.state !== 'Failed') &&
        !result.response.errorMessage);
    // all successes
    if (this.deployResults.every((result) => isSuccessLike(result))) {
      return this.setExitCode(0);
    }

    // 1 and 0 === 68 "partial success"
    if (
      this.deployResults.some((result) => isSuccessLike(result)) &&
      this.deployResults.some((result) => StatusCodeMap.get(result.response.status) === 1)
    ) {
      return this.setExitCode(68);
    }

    // all fails
    if (this.deployResults.every((result) => StatusCodeMap.get(result.response.status) === 1)) {
      return this.setExitCode(1);
    }

    this.warn(` Unexpected exit code ${this.deployResults.map((result) => result.response.errorMessage).join(', ')}`);
    this.setExitCode(1);
  }

  protected formatResult(): PushResponse {
    if (!this.deployResults.length) {
      this.log('No results found');
    }
    const formatterOptions = {
      quiet: this.flags.quiet ?? false,
    };

    const formatter = new PushResultFormatter(
      new Ux({ jsonEnabled: this.jsonEnabled() }),
      formatterOptions,
      this.deployResults,
      this.deletes
    );

    // Only display results to console when JSON flag is unset.
    if (!this.jsonEnabled()) {
      formatter.display();
    }

    return formatter.getJson();
  }
}
