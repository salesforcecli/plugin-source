/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Lifecycle, Messages, Org } from '@salesforce/core';
import { Duration, env } from '@salesforce/kit';
import { SourceTracking } from '@salesforce/source-tracking';
import { ComponentSetBuilder, DeployVersionData } from '@salesforce/source-deploy-retrieve';
import {
  Flags,
  loglevel,
  orgApiVersionFlagWithDeprecations,
  requiredOrgFlagWithDeprecations,
  Ux,
} from '@salesforce/sf-plugins-core';
import { Interfaces } from '@oclif/core';
import { DeployCommand, getCoverageFormattersOptions, reportsFormatters, TestLevel } from '../../../deployCommand';
import { DeployCommandResult, DeployResultFormatter } from '../../../formatters/deployResultFormatter';
import {
  DeployAsyncResultFormatter,
  DeployCommandAsyncResult,
} from '../../../formatters/source/deployAsyncResultFormatter';
import { ProgressFormatter } from '../../../formatters/progressFormatter';
import { DeployProgressBarFormatter } from '../../../formatters/deployProgressBarFormatter';
import { DeployProgressStatusFormatter } from '../../../formatters/deployProgressStatusFormatter';
import { filterConflictsByComponentSet, trackingSetup, updateTracking } from '../../../trackingFunctions';
import { ResultFormatterOptions } from '../../../formatters/resultFormatter';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'deploy');
const deployMessages = Messages.loadMessages('@salesforce/plugin-source', 'deployCommand');

// One of these flags must be specified for a valid deploy.
const xorFlags = ['manifest', 'metadata', 'sourcepath', 'validateddeployrequestid'];

export class Deploy extends DeployCommand {
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly requiresProject = true;
  public static readonly flags = {
    'api-version': orgApiVersionFlagWithDeprecations,
    loglevel,
    'target-org': requiredOrgFlagWithDeprecations,
    checkonly: Flags.boolean({
      char: 'c',
      description: messages.getMessage('flags.checkonly'),
      summary: messages.getMessage('flagsLong.checkonly'),
    }),
    soapdeploy: Flags.boolean({
      default: false,
      description: messages.getMessage('flags.soapDeploy'),
    }),
    wait: Flags.duration({
      unit: 'minutes',
      char: 'w',
      default: Duration.minutes(Deploy.DEFAULT_WAIT_MINUTES),
      min: 0, // wait=0 means deploy is asynchronous
      description: messages.getMessage('flags.wait'),
      summary: messages.getMessage('flagsLong.wait'),
    }),
    testlevel: Flags.string({
      char: 'l',
      description: messages.getMessage('flags.testLevel'),
      summary: messages.getMessage('flagsLong.testLevel'),
      options: ['NoTestRun', 'RunSpecifiedTests', 'RunLocalTests', 'RunAllTestsInOrg'],
    }),
    runtests: Flags.string({
      multiple: true,
      char: 'r',
      description: messages.getMessage('flags.runTests'),
      summary: messages.getMessage('flagsLong.runTests'),
    }),
    ignoreerrors: Flags.boolean({
      char: 'o',
      description: messages.getMessage('flags.ignoreErrors'),
      summary: messages.getMessage('flagsLong.ignoreErrors'),
    }),
    ignorewarnings: Flags.boolean({
      char: 'g',
      description: messages.getMessage('flags.ignoreWarnings'),
      summary: messages.getMessage('flagsLong.ignoreWarnings'),
    }),
    purgeondelete: Flags.boolean({
      description: messages.getMessage('flags.purgeOnDelete'),
      dependsOn: ['manifest'],
    }),
    validateddeployrequestid: Flags.salesforceId({
      char: 'q',
      description: messages.getMessage('flags.validateDeployRequestId'),
      summary: messages.getMessage('flagsLong.validateDeployRequestId'),
      exactlyOne: xorFlags,
      exclusive: ['checkonly', 'testlevel', 'runtests', 'tracksource'],
      startsWith: '0Af',
    }),
    verbose: Flags.boolean({
      description: messages.getMessage('flags.verbose'),
    }),
    metadata: Flags.string({
      multiple: true,
      char: 'm',
      description: messages.getMessage('flags.metadata'),
      summary: messages.getMessage('flagsLong.metadata'),
      exactlyOne: xorFlags,
    }),
    sourcepath: Flags.string({
      multiple: true,
      char: 'p',
      description: messages.getMessage('flags.sourcePath'),
      summary: messages.getMessage('flagsLong.sourcePath'),
      exactlyOne: xorFlags,
    }),
    manifest: Flags.file({
      char: 'x',
      description: messages.getMessage('flags.manifest'),
      summary: messages.getMessage('flagsLong.manifest'),
      exactlyOne: xorFlags,
    }),
    predestructivechanges: Flags.file({
      description: messages.getMessage('flags.predestructivechanges'),
      dependsOn: ['manifest'],
    }),
    postdestructivechanges: Flags.file({
      description: messages.getMessage('flags.postdestructivechanges'),
      dependsOn: ['manifest'],
    }),
    tracksource: Flags.boolean({
      char: 't',
      description: messages.getMessage('flags.tracksource'),
      exclusive: ['checkonly', 'validateddeployrequestid'],
    }),
    forceoverwrite: Flags.boolean({
      char: 'f',
      description: messages.getMessage('flags.forceoverwrite'),
      dependsOn: ['tracksource'],
    }),
    resultsdir: Flags.directory({
      description: messages.getMessage('flags.resultsDir'),
    }),
    coverageformatters: Flags.string({
      multiple: true,
      description: messages.getMessage('flags.coverageFormatters'),
      options: reportsFormatters,
      helpValue: reportsFormatters.join(','),
    }),
    junit: Flags.boolean({ description: messages.getMessage('flags.junit') }),
  };
  protected readonly lifecycleEventNames = ['predeploy', 'postdeploy'];
  protected tracking: SourceTracking;
  private flags: Interfaces.InferredFlags<typeof Deploy.flags>;
  private org: Org;
  public async run(): Promise<DeployCommandResult | DeployCommandAsyncResult> {
    this.flags = (await this.parse(Deploy)).flags;
    this.org = this.flags['target-org'];
    await this.preChecks();
    await this.deploy();
    this.resolveSuccess();
    await this.maybeUpdateTracking();
    return this.formatResult();
  }

  protected async preChecks(): Promise<void> {
    if (this.flags.tracksource) {
      this.tracking = await trackingSetup({
        commandName: 'force:source:deploy',
        // we'll check ACTUAL conflicts once we get a componentSet built
        ignoreConflicts: true,
        org: this.org,
        project: this.project,
        ux: new Ux({ jsonEnabled: this.jsonEnabled() }),
      });
    }
  }

  // There are 3 types of deploys:
  //   1. synchronous - deploy metadata and wait for the deploy to complete.
  //   2. asynchronous - deploy metadata and immediately return.
  //   3. recent validation - deploy metadata that's already been validated by the org
  protected async deploy(): Promise<void> {
    const waitDuration = this.flags.wait;
    this.isAsync = waitDuration.quantity === 0;
    this.isRest = this.isRestDeploy();

    if (this.isAsync && (this.flags.coverageformatters || this.flags.junit)) {
      this.warn(messages.getMessage('asyncCoverageJunitWarning'));
    }

    if (this.flags.validateddeployrequestid) {
      this.deployResult = await this.deployRecentValidation(
        this.flags.validateddeployrequestid,
        this.org.getConnection()
      );
    } else {
      this.componentSet = await ComponentSetBuilder.build({
        apiversion: this.flags['api-version'],
        sourceapiversion: await this.getSourceApiVersion(),
        sourcepath: this.flags.sourcepath,
        manifest: this.flags.manifest && {
          manifestPath: this.flags.manifest,
          directoryPaths: this.getPackageDirs(),
          destructiveChangesPre: this.flags.predestructivechanges,
          destructiveChangesPost: this.flags.postdestructivechanges,
        },
        metadata: this.flags.metadata && {
          metadataEntries: this.flags.metadata,
          directoryPaths: this.getPackageDirs(),
        },
      });
      if (this.flags.tracksource) {
        // will throw if conflicts exist
        if (!this.flags.forceoverwrite) {
          await filterConflictsByComponentSet({
            tracking: this.tracking,
            components: this.componentSet,
            ux: new Ux({ jsonEnabled: this.jsonEnabled() }),
          });
        }
        const localDeletes = await this.tracking.getChanges<string>({
          origin: 'local',
          state: 'delete',
          format: 'string',
        });
        if (localDeletes.length) {
          this.warn(messages.getMessage('deployWontDelete'));
        }
      }
      // fire predeploy event for sync and async deploys
      await Lifecycle.getInstance().emit('predeploy', this.componentSet.toArray());
      const username = this.org.getUsername();
      // eslint-disable-next-line @typescript-eslint/require-await
      Lifecycle.getInstance().on('apiVersionDeploy', async (apiData: DeployVersionData) => {
        this.log(
          deployMessages.getMessage('apiVersionMsgDetailed', [
            'Deploying',
            apiData.manifestVersion,
            username,
            apiData.apiVersion,
            apiData.webService,
          ])
        );
      });

      const deploy = await this.componentSet.deploy({
        usernameOrConnection: username,
        apiOptions: {
          ...{
            purgeOnDelete: this.flags.purgeondelete ?? false,
            ignoreWarnings: this.flags.ignorewarnings ?? false,
            rollbackOnError: !this.flags.ignoreerrors ?? false,
            checkOnly: this.flags.checkonly ?? false,
            rest: this.isRest,
          },
          // if runTests is defaulted as 'NoTestRun' and deploying to prod, you'll get this error
          // https://github.com/forcedotcom/cli/issues/1542
          // add additional properties conditionally ()
          ...(this.flags.testlevel ? { testLevel: this.flags.testlevel as TestLevel } : {}),
          ...(this.flags.runtests ? { runTests: this.flags.runtests } : {}),
        },
      });
      this.asyncDeployResult = { id: deploy.id };
      this.updateDeployId(deploy.id);

      if (!this.isAsync) {
        // we're not print JSON output
        if (!this.jsonEnabled()) {
          const progressFormatter: ProgressFormatter = env.getBoolean('SFDX_USE_PROGRESS_BAR', true)
            ? new DeployProgressBarFormatter(new Ux({ jsonEnabled: this.jsonEnabled() }))
            : new DeployProgressStatusFormatter(new Ux({ jsonEnabled: this.jsonEnabled() }));
          progressFormatter.progress(deploy);
        }
        this.deployResult = await deploy.pollStatus({ timeout: waitDuration });
      }
    }

    if (this.deployResult) {
      // Only fire the postdeploy event when we have results. I.e., not async.
      await Lifecycle.getInstance().emit('postdeploy', this.deployResult);
    }
  }

  protected formatResult(): DeployCommandResult | DeployCommandAsyncResult {
    this.resultsDir = this.resolveOutputDir(
      this.flags.coverageformatters,
      this.flags.junit,
      this.flags.resultsdir,
      this.deployResult?.response?.id,
      false
    );

    const formatterOptions: ResultFormatterOptions = {
      verbose: this.flags.verbose ?? false,
      username: this.org.getUsername(),
      coverageOptions: getCoverageFormattersOptions(this.flags.coverageformatters),
      junitTestResults: this.flags.junit,
      resultsDir: this.resultsDir,
      testsRan: (this.flags.testlevel ?? 'NoTestRun') !== 'NoTestRun',
    };

    const formatter = this.isAsync
      ? new DeployAsyncResultFormatter(
          new Ux({ jsonEnabled: this.jsonEnabled() }),
          formatterOptions,
          this.asyncDeployResult
        )
      : new DeployResultFormatter(new Ux({ jsonEnabled: this.jsonEnabled() }), formatterOptions, this.deployResult);

    if (!this.isAsync) {
      this.maybeCreateRequestedReports({
        coverageformatters: this.flags.coverageformatters,
        junit: this.flags.junit,
        org: this.org,
      });
    }

    // Only display results to console when JSON flag is unset.
    if (!this.jsonEnabled()) {
      formatter.display();
    }

    return formatter.getJson();
  }

  private async maybeUpdateTracking(): Promise<void> {
    if (this.flags.tracksource ?? false) {
      return updateTracking({
        ux: new Ux({ jsonEnabled: this.jsonEnabled() }),
        result: this.deployResult,
        tracking: this.tracking,
      });
    }
  }
}
