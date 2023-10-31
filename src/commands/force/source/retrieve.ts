/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { dirname, join, resolve } from 'node:path';
import fs from 'node:fs';

import { fileURLToPath } from 'node:url';
import { Lifecycle, Messages, SfError, SfProject } from '@salesforce/core';
import { Duration } from '@salesforce/kit';
import {
  ComponentSet,
  ComponentSetBuilder,
  RequestStatus,
  RetrieveVersionData,
  RetrieveResult,
  RegistryAccess,
} from '@salesforce/source-deploy-retrieve';
import { SourceTracking } from '@salesforce/source-tracking';
import { Interfaces } from '@oclif/core';
import {
  arrayWithDeprecation,
  Flags,
  loglevel,
  orgApiVersionFlagWithDeprecations,
  requiredOrgFlagWithDeprecations,
  Ux,
} from '@salesforce/sf-plugins-core';
import { AlphabetLowercase } from '@oclif/core/lib/interfaces';
import { SourceCommand } from '../../../sourceCommand.js';
import {
  PackageRetrieval,
  RetrieveCommandResult,
  RetrieveResultFormatter,
} from '../../../formatters/retrieveResultFormatter.js';
import { filterConflictsByComponentSet, trackingSetup, updateTracking } from '../../../trackingFunctions.js';
import { promisesQueue } from '../../../promiseQueue.js';

Messages.importMessagesDirectory(dirname(fileURLToPath(import.meta.url)));
const messages = Messages.loadMessages('@salesforce/plugin-source', 'retrieve');
const spinnerMessages = Messages.loadMessages('@salesforce/plugin-source', 'spinner');
const retrieveMessages = Messages.loadMessages('@salesforce/plugin-source', 'retrieve');

const replacement = 'project retrieve start';

export class Retrieve extends SourceCommand {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly requiresProject = true;
  public static readonly state = 'deprecated';
  public static readonly deprecationOptions = {
    to: replacement,
    message: messages.getMessage('deprecation', [replacement]),
  };
  public static readonly flags = {
    // I have no idea why 'a' isn't matching the type AlphabetLowercase automatically
    'api-version': { ...orgApiVersionFlagWithDeprecations, char: 'a' as AlphabetLowercase },
    loglevel,
    'target-org': requiredOrgFlagWithDeprecations,
    retrievetargetdir: Flags.directory({
      char: 'r',
      description: messages.getMessage('flags.retrievetargetdir.description'),
      summary: messages.getMessage('flags.retrievetargetdir.summary'),
      exclusive: ['packagenames', 'sourcepath'],
    }),
    sourcepath: arrayWithDeprecation({
      char: 'p',
      description: messages.getMessage('flags.sourcePath.description'),
      summary: messages.getMessage('flags.sourcePath.summary'),
      exclusive: ['manifest', 'metadata'],
    }),
    wait: Flags.duration({
      unit: 'minutes',
      char: 'w',
      default: Duration.minutes(SourceCommand.DEFAULT_WAIT_MINUTES),
      min: 1,
      description: messages.getMessage('flags.wait.description'),
      summary: messages.getMessage('flags.wait.summary'),
    }),
    manifest: Flags.file({
      char: 'x',
      description: messages.getMessage('flags.manifest.description'),
      summary: messages.getMessage('flags.manifest.summary'),
      exclusive: ['metadata', 'sourcepath'],
    }),
    metadata: arrayWithDeprecation({
      char: 'm',
      description: messages.getMessage('flags.metadata.description'),
      summary: messages.getMessage('flags.metadata.summary'),
      exclusive: ['manifest', 'sourcepath'],
    }),
    packagenames: arrayWithDeprecation({
      char: 'n',
      summary: messages.getMessage('flags.packagename.summary'),
    }),
    tracksource: Flags.boolean({
      char: 't',
      summary: messages.getMessage('flags.tracksource.summary'),
    }),
    forceoverwrite: Flags.boolean({
      char: 'f',
      summary: messages.getMessage('flags.forceoverwrite.summary'),
      dependsOn: ['tracksource'],
    }),
    verbose: Flags.boolean({
      summary: messages.getMessage('flags.verbose.summary'),
    }),
  };
  protected readonly lifecycleEventNames = ['preretrieve', 'postretrieve'];
  protected retrieveResult: RetrieveResult;
  protected tracking: SourceTracking;
  private resolvedTargetDir: string;
  private flags: Interfaces.InferredFlags<typeof Retrieve.flags>;
  private registry = new RegistryAccess();

  public async run(): Promise<RetrieveCommandResult> {
    this.flags = (await this.parse(Retrieve)).flags;
    await this.preChecks();
    await this.retrieve();
    this.resolveSuccess();
    await this.maybeUpdateTracking();
    await this.moveResultsForRetrieveTargetDir();
    return this.formatResult();
  }

  protected async preChecks(): Promise<void> {
    if (this.flags.retrievetargetdir) {
      this.resolvedTargetDir = resolve(this.flags.retrievetargetdir);
      if (this.overlapsPackage()) {
        throw messages.createError('retrieveTargetDirOverlapsPackage', [this.flags.retrievetargetdir]);
      }
    }
    // we need something to retrieve
    const retrieveInputs = [this.flags.manifest, this.flags.metadata, this.flags.sourcepath, this.flags.packagenames];
    if (!retrieveInputs.some((x) => x)) {
      throw new SfError(messages.getMessage('nothingToRetrieve'));
    }
    if (this.flags.tracksource) {
      this.tracking = await trackingSetup({
        ux: new Ux({ jsonEnabled: this.jsonEnabled() }),
        org: this.flags['target-org'],
        project: this.project,
        ignoreConflicts: true,
      });
    }
  }

  protected async retrieve(): Promise<void> {
    const username = this.flags['target-org'].getUsername();
    // eslint-disable-next-line @typescript-eslint/require-await
    Lifecycle.getInstance().on('apiVersionRetrieve', async (apiData: RetrieveVersionData) => {
      this.log(
        retrieveMessages.getMessage('apiVersionMsgDetailed', [
          'Retrieving',
          apiData.manifestVersion,
          username,
          apiData.apiVersion,
        ])
      );
    });
    this.spinner.start(spinnerMessages.getMessage('retrieve.componentSetBuild'));
    this.componentSet = await ComponentSetBuilder.build({
      apiversion: this.flags['api-version'],
      sourceapiversion: await this.getSourceApiVersion(),
      packagenames: this.flags.packagenames,
      sourcepath: this.flags.sourcepath,
      manifest: this.flags.manifest && {
        manifestPath: this.flags.manifest,
        directoryPaths: this.flags.retrievetargetdir ? [] : this.getPackageDirs(),
      },
      metadata: this.flags.metadata && {
        metadataEntries: this.flags.metadata,
        directoryPaths: this.flags.retrievetargetdir ? [] : this.getPackageDirs(),
      },
    });

    if (this.flags.manifest || this.flags.metadata) {
      if (this.wantsToRetrieveCustomFields()) {
        this.warn(messages.getMessage('wantsToRetrieveCustomFields'));
        this.componentSet.add({
          fullName: ComponentSet.WILDCARD,
          type: this.registry.getTypeByName('CustomObject'),
        });
      }
    }
    if (this.flags.tracksource) {
      // will throw if conflicts exist
      if (!this.flags.forceoverwrite) {
        await filterConflictsByComponentSet({
          tracking: this.tracking,
          components: this.componentSet,
          ux: new Ux({ jsonEnabled: this.jsonEnabled() }),
        });
      }

      const remoteDeletes = await this.tracking.getChanges<string>({
        origin: 'remote',
        state: 'delete',
        format: 'string',
      });
      if (remoteDeletes.length) {
        this.warn(messages.getMessage('retrieveWontDelete'));
      }
    }

    await Lifecycle.getInstance().emit('preretrieve', this.componentSet.toArray());

    this.spinner.status = spinnerMessages.getMessage('retrieve.sendingRequest');
    const mdapiRetrieve = await this.componentSet.retrieve({
      usernameOrConnection: username,
      merge: true,
      output: this.resolvedTargetDir || this.project.getDefaultPackage().fullPath,
      packageOptions: this.flags.packagenames,
    });

    this.spinner.status = spinnerMessages.getMessage('retrieve.polling');
    this.retrieveResult = await mdapiRetrieve.pollStatus({ timeout: this.flags.wait });

    await Lifecycle.getInstance().emit('postretrieve', this.retrieveResult.getFileResponses());
    this.spinner.stop();
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

    this.setExitCode(StatusCodeMap.get(this.retrieveResult.response.status) ?? 1);
  }

  protected async formatResult(): Promise<RetrieveCommandResult> {
    const packages: PackageRetrieval[] = [];
    const projectPath = await SfProject.resolveProjectPath();

    (this.flags.packagenames ?? []).forEach((name) => {
      packages.push({ name, path: join(projectPath, name) });
    });

    const formatterOptions = {
      waitTime: this.flags.wait.quantity,
      verbose: this.flags.verbose ?? false,
      packages,
    };
    const formatter = new RetrieveResultFormatter(
      new Ux({ jsonEnabled: this.jsonEnabled() }),
      formatterOptions,
      this.retrieveResult
    );

    // Only display results to console when JSON flag is unset.
    if (!this.jsonEnabled()) {
      formatter.display();
    }

    return formatter.getJson();
  }

  private async maybeUpdateTracking(): Promise<void> {
    if (this.flags.tracksource ?? false) {
      return updateTracking({
        tracking: this.tracking,
        result: this.retrieveResult,
        ux: new Ux({ jsonEnabled: this.jsonEnabled() }),
      });
    }
  }

  private wantsToRetrieveCustomFields(): boolean {
    const hasCustomField = this.componentSet.has({
      type: this.registry.getTypeByName('CustomField'),
      fullName: ComponentSet.WILDCARD,
    });

    const hasCustomObject = this.componentSet.has({
      type: this.registry.getTypeByName('CustomObject'),
      fullName: ComponentSet.WILDCARD,
    });
    return hasCustomField && !hasCustomObject;
  }

  private async moveResultsForRetrieveTargetDir(): Promise<void> {
    async function mv(src: string): Promise<string[]> {
      let directories: string[] = [];
      let files: string[] = [];
      const srcStat = await fs.promises.stat(src);
      if (srcStat.isDirectory()) {
        const contents = await fs.promises.readdir(src, { withFileTypes: true });
        [directories, files] = contents.reduce<[string[], string[]]>(
          (acc, dirent) => {
            if (dirent.isDirectory()) {
              acc[0].push(dirent.name);
            } else {
              acc[1].push(dirent.name);
            }
            return acc;
          },
          [[], []]
        );

        directories = directories.map((dir) => join(src, dir));
      } else {
        files.push(src);
      }
      await promisesQueue(
        files,
        async (file: string): Promise<string> => {
          const dest = join(src.replace(join('main', 'default'), ''), file);
          const destDir = dirname(dest);
          await fs.promises.mkdir(destDir, { recursive: true });
          await fs.promises.rename(join(src, file), dest);
          return dest;
        },
        50
      );
      return directories;
    }

    if (!this.flags.retrievetargetdir) {
      return;
    }

    // move contents of 'main/default' to 'retrievetargetdir'
    await promisesQueue([join(this.resolvedTargetDir, 'main', 'default')], mv, 5, true);
    // remove 'main/default'
    await fs.promises.rm(join(this.flags.retrievetargetdir, 'main'), { recursive: true });
    this.retrieveResult.getFileResponses().forEach((fileResponse) => {
      fileResponse.filePath = fileResponse.filePath?.replace(join('main', 'default'), '');
    });
  }

  private overlapsPackage(): boolean {
    return !!this.project.getPackageNameFromPath(this.resolvedTargetDir);
  }
}
