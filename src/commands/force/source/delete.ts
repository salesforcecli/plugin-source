/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { confirm } from 'cli-ux/lib/prompt';
import { flags, FlagsConfig } from '@salesforce/command';
import { Messages } from '@salesforce/core';
import {
  ComponentSet,
  ComponentStatus,
  DestructiveChangesType,
  FileResponse,
  MetadataComponent,
  RequestStatus,
  SourceComponent,
} from '@salesforce/source-deploy-retrieve';
import { Duration, env } from '@salesforce/kit';
import { SourceTracking } from '@salesforce/source-tracking';
import { DeployCommand, TestLevel } from '../../../deployCommand';
import { ComponentSetBuilder } from '../../../componentSetBuilder';
import { DeployCommandResult, DeployResultFormatter } from '../../../formatters/deployResultFormatter';
import { DeleteResultFormatter } from '../../../formatters/source/deleteResultFormatter';
import { ProgressFormatter } from '../../../formatters/progressFormatter';
import { DeployProgressBarFormatter } from '../../../formatters/deployProgressBarFormatter';
import { DeployProgressStatusFormatter } from '../../../formatters/deployProgressStatusFormatter';
import { updateTracking, trackingSetup, filterConflictsByComponentSet } from '../../../trackingFunctions';
const fsPromises = fs.promises;

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'delete');
const xorFlags = ['metadata', 'sourcepath'];
export class Delete extends DeployCommand {
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessage('examples').split(os.EOL);
  public static readonly requiresProject = true;
  public static readonly requiresUsername = true;
  public static readonly flagsConfig: FlagsConfig = {
    checkonly: flags.boolean({
      char: 'c',
      description: messages.getMessage('flags.checkonly'),
      longDescription: messages.getMessage('flagsLong.checkonly'),
    }),
    wait: flags.minutes({
      char: 'w',
      default: Duration.minutes(Delete.DEFAULT_WAIT_MINUTES),
      min: Duration.minutes(1),
      description: messages.getMessage('flags.wait'),
      longDescription: messages.getMessage('flagsLong.wait'),
    }),
    testlevel: flags.enum({
      char: 'l',
      description: messages.getMessage('flags.testLevel'),
      longDescription: messages.getMessage('flagsLong.testLevel'),
      options: ['NoTestRun', 'RunLocalTests', 'RunAllTestsInOrg'],
      default: 'NoTestRun',
    }),
    noprompt: flags.boolean({
      char: 'r',
      description: messages.getMessage('flags.noprompt'),
    }),
    metadata: flags.array({
      char: 'm',
      description: messages.getMessage('flags.metadata'),
      longDescription: messages.getMessage('flagsLong.metadata'),
      exactlyOne: xorFlags,
    }),
    sourcepath: flags.array({
      char: 'p',
      description: messages.getMessage('flags.sourcepath'),
      longDescription: messages.getMessage('flagsLong.sourcepath'),
      exactlyOne: xorFlags,
    }),
    tracksource: flags.boolean({
      char: 't',
      description: messages.getMessage('flags.tracksource'),
      exclusive: ['checkonly'],
    }),
    forceoverwrite: flags.boolean({
      char: 'f',
      description: messages.getMessage('flags.forceoverwrite'),
      dependsOn: ['tracksource'],
    }),
    verbose: flags.builtin({
      description: messages.getMessage('flags.verbose'),
    }),
  };
  protected tracking: SourceTracking;
  protected readonly lifecycleEventNames = ['predeploy', 'postdeploy'];
  private deleteResultFormatter: DeleteResultFormatter | DeployResultFormatter;
  private aborted = false;
  private components: MetadataComponent[];
  // create the delete FileResponse as we're parsing the comp. set to use in the output
  private mixedDeployDelete: { deploy: string[]; delete: FileResponse[] } = { delete: [], deploy: [] };
  // map of component in project, to where it is stashed
  private stashPath = new Map<string, string>();
  private tempDir = path.join(os.tmpdir(), 'source_delete');

  public async run(): Promise<DeployCommandResult> {
    await this.preChecks();
    await this.delete();
    const fileResponses = this.mixedDeployDelete.delete ?? this.deployResult.getFileResponses();
    await this.resolveSuccess();
    const result = this.formatResult();
    // The DeleteResultFormatter will use SDR and scan the directory, if the files have been deleted, it will throw an error
    // so we'll delete the files locally now
    await this.deleteFilesLocally();
    // makes sure files are deleted before updating tracking files
    if (this.getFlag<boolean>('tracksource')) {
      await updateTracking({
        ux: this.ux,
        result: this.deployResult,
        tracking: this.tracking,
        fileResponses,
      });
    }
    return result;
  }

  protected async preChecks(): Promise<void> {
    if (this.flags.tracksource) {
      this.tracking = await trackingSetup({
        ux: this.ux,
        org: this.org,
        project: this.project,
        ignoreConflicts: true,
      });
    }
  }

  protected async delete(): Promise<void> {
    this.deleteResultFormatter = new DeleteResultFormatter(this.logger, this.ux, {});
    const sourcepaths = this.getFlag<string[]>('sourcepath');

    this.componentSet = await ComponentSetBuilder.build({
      apiversion: this.getFlag<string>('apiversion'),
      sourceapiversion: await this.getSourceApiVersion(),
      sourcepath: sourcepaths,
      metadata: this.flags.metadata && {
        metadataEntries: this.getFlag<string[]>('metadata'),
        directoryPaths: this.getPackageDirs(),
      },
    });
    if (this.getFlag<boolean>('tracksource') && !this.getFlag<boolean>('forceoverwrite')) {
      await filterConflictsByComponentSet({ tracking: this.tracking, components: this.componentSet, ux: this.ux });
    }
    this.components = this.componentSet.toArray();

    if (!this.components.length) {
      // if we didn't find any components to delete, let the user know and exit
      (this.deleteResultFormatter as DeleteResultFormatter).displayNoResultsFound();
      return;
    }

    // create a new ComponentSet and mark everything for deletion
    const cs = new ComponentSet([]);
    this.components.map((component) => {
      if (component instanceof SourceComponent) {
        cs.add(component, DestructiveChangesType.POST);
      } else {
        // a remote-only delete
        cs.add(new SourceComponent({ name: component.fullName, type: component.type }), DestructiveChangesType.POST);
      }
    });
    this.componentSet = cs;

    if (sourcepaths) {
      // determine if user is trying to delete a single file from a bundle, which is actually just an fs delete operation
      // and then a constructive deploy on the "new" bundle
      this.components
        .filter((comp) => comp.type.strategies?.adapter === 'bundle' && comp instanceof SourceComponent)
        .map((bundle: SourceComponent) => {
          sourcepaths.map(async (sourcepath) => {
            // walkContent returns absolute paths while sourcepath will usually be relative
            if (bundle.walkContent().find((content) => content.endsWith(sourcepath))) {
              await this.moveBundleToManifest(bundle, sourcepath);
            }
          });
        });
    }

    this.aborted = !(await this.handlePrompt());
    if (this.aborted) return;

    // fire predeploy event for the delete
    await this.lifecycle.emit('predeploy', this.components);
    this.isRest = await this.isRestDeploy();
    this.ux.log(`*** Deleting with ${this.isRest ? 'REST' : 'SOAP'} API ***`);

    const deploy = await this.componentSet.deploy({
      usernameOrConnection: this.org.getUsername(),
      apiOptions: {
        rest: this.isRest,
        checkOnly: this.getFlag<boolean>('checkonly', false),
        testLevel: this.getFlag<TestLevel>('testlevel'),
      },
    });
    this.updateDeployId(deploy.id);

    if (!this.isJsonOutput()) {
      const progressFormatter: ProgressFormatter = env.getBoolean('SFDX_USE_PROGRESS_BAR', true)
        ? new DeployProgressBarFormatter(this.logger, this.ux)
        : new DeployProgressStatusFormatter(this.logger, this.ux);
      progressFormatter.progress(deploy);
    }

    this.deployResult = await deploy.pollStatus({ timeout: this.getFlag<Duration>('wait') });
    await this.lifecycle.emit('postdeploy', this.deployResult);
  }

  /**
   * Checks the response status to determine whether the delete was successful.
   */
  protected async resolveSuccess(): Promise<void> {
    const status = this.deployResult?.response?.status;
    if (status !== RequestStatus.Succeeded && !this.aborted) {
      this.setExitCode(1);
    }
    // if deploy failed OR the operation was cancelled, restore the stashed files if they exist
    else if (status !== RequestStatus.Succeeded || this.aborted) {
      await Promise.all(
        this.mixedDeployDelete.delete.map(async (file) => {
          await this.restoreFileFromStash(file.filePath);
        })
      );
    } else if (this.mixedDeployDelete.delete.length) {
      // successful delete -> delete the stashed file
      await this.deleteStash();
    }
  }

  protected formatResult(): DeployCommandResult {
    const formatterOptions = {
      verbose: this.getFlag<boolean>('verbose', false),
    };

    this.deleteResultFormatter = this.mixedDeployDelete.deploy.length
      ? new DeployResultFormatter(this.logger, this.ux, formatterOptions, this.deployResult)
      : new DeleteResultFormatter(this.logger, this.ux, formatterOptions, this.deployResult);

    // Only display results to console when JSON flag is unset.
    if (!this.isJsonOutput()) {
      this.deleteResultFormatter.display();
    }

    if (this.mixedDeployDelete.deploy.length && !this.aborted) {
      // override JSON output when we actually deployed
      const json = this.deleteResultFormatter.getJson();
      json.deletedSource = this.mixedDeployDelete.delete; // to match toolbelt json output
      json.outboundFiles = []; // to match toolbelt version
      json.deletes = json.deploys; // to match toolbelt version
      delete json.deploys;
      return json;
    }

    if (this.aborted) {
      return {
        status: 0,
        result: {
          deletedSource: [],
          outboundFiles: [],
          deletes: [{}],
        },
      } as unknown as DeployCommandResult;
    }

    return this.deleteResultFormatter.getJson();
  }

  private async deleteFilesLocally(): Promise<void> {
    if (!this.getFlag('checkonly') && this.deployResult?.response?.status === RequestStatus.Succeeded) {
      const promises = [];
      this.components.map((component: SourceComponent) => {
        // mixed delete/deploy operations have already been deleted and stashed
        if (!this.mixedDeployDelete.delete.length) {
          if (component.content) {
            const stats = fs.statSync(component.content);
            if (stats.isDirectory()) {
              promises.push(fsPromises.rm(component.content, { recursive: true }));
            } else {
              promises.push(fsPromises.unlink(component.content));
            }
          }
          if (component.xml) {
            promises.push(fsPromises.unlink(component.xml));
          }
        }
      });
      await Promise.all(promises);
    }
  }

  private async moveFileToStash(file: string): Promise<void> {
    await fsPromises.mkdir(path.dirname(this.stashPath.get(file)), { recursive: true });
    await fsPromises.copyFile(file, this.stashPath.get(file));
    await fsPromises.unlink(file);
  }

  private async restoreFileFromStash(file: string): Promise<void> {
    await fsPromises.rename(this.stashPath.get(file), file);
  }

  private async deleteStash(): Promise<void> {
    await fsPromises.rm(this.tempDir, { recursive: true, force: true });
  }

  private async moveBundleToManifest(bundle: SourceComponent, sourcepath: string): Promise<void> {
    // if one of the passed in sourcepaths is to a bundle component
    const fileName = path.basename(sourcepath);
    const fullName = path.join(bundle.name, fileName);
    this.mixedDeployDelete.delete.push({
      state: ComponentStatus.Deleted,
      fullName,
      type: bundle.type.name,
      filePath: sourcepath,
    });
    // stash the file in case we need to restore it due to failed deploy/aborted command
    this.stashPath.set(sourcepath, path.join(this.tempDir, fullName));
    await this.moveFileToStash(sourcepath);

    // re-walk the directory to avoid picking up the deleted file
    this.mixedDeployDelete.deploy.push(...bundle.walkContent());

    // now remove the bundle from destructive changes and add to manifest
    // set the bundle as NOT marked for delete
    this.componentSet.destructiveChangesPost.delete(`${bundle.type.id}#${bundle.fullName}`);
    bundle.setMarkedForDelete(false);
    this.componentSet.add(bundle);
  }

  private async handlePrompt(): Promise<boolean> {
    if (!this.getFlag('noprompt')) {
      const remote: string[] = [];
      let local: string[] = [];
      const message: string[] = [];

      this.components.flatMap((component) => {
        if (component instanceof SourceComponent) {
          local.push(component.xml, ...component.walkContent());
        } else {
          // remote only metadata
          remote.push(`${component.type.name}:${component.fullName}`);
        }
      });

      if (this.mixedDeployDelete.delete.length) {
        local = this.mixedDeployDelete.delete.map((fr) => fr.fullName);
      }

      if (this.mixedDeployDelete.deploy.length) {
        message.push(messages.getMessage('deployPrompt', [[...new Set(this.mixedDeployDelete.deploy)].join('\n')]));
      }

      if (remote.length) {
        message.push(messages.getMessage('remotePrompt', [[...new Set(remote)].join('\n')]));
      }

      if (local.length) {
        if (message.length) {
          // add a whitespace between remote and local
          message.push('\n');
        }
        message.push('\n', messages.getMessage('localPrompt', [[...new Set(local)].join('\n')]));
      }

      message.push(messages.getMessage('areYouSure'));
      return confirm(message.join(''));
    }
    return true;
  }
}
