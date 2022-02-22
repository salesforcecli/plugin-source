/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as os from 'os';
import { join } from 'path';
import { flags, FlagsConfig } from '@salesforce/command';
import { Messages, SfdxProject } from '@salesforce/core';
import { Duration } from '@salesforce/kit';
import { ComponentSet, RequestStatus, RetrieveResult } from '@salesforce/source-deploy-retrieve';
import { SourceTracking } from '@salesforce/source-tracking';
import { SourceCommand } from '../../../sourceCommand';
import {
  PackageRetrieval,
  RetrieveCommandResult,
  RetrieveResultFormatter,
} from '../../../formatters/retrieveResultFormatter';
import { ComponentSetBuilder } from '../../../componentSetBuilder';
import { trackingSetup, updateTracking, filterConflictsByComponentSet } from '../../../trackingFunctions';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'retrieve');
const spinnerMessages = Messages.loadMessages('@salesforce/plugin-source', 'spinner');

export class Retrieve extends SourceCommand {
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessage('examples').split(os.EOL);
  public static readonly requiresProject = true;
  public static readonly requiresUsername = true;
  public static readonly flagsConfig: FlagsConfig = {
    apiversion: flags.builtin({
      /* eslint-disable-next-line @typescript-eslint/ban-ts-comment */
      // @ts-ignore force char override for backward compat
      char: 'a',
    }),
    sourcepath: flags.array({
      char: 'p',
      description: messages.getMessage('flags.sourcePath'),
      longDescription: messages.getMessage('flagsLong.sourcePath'),
      exclusive: ['manifest', 'metadata'],
    }),
    wait: flags.minutes({
      char: 'w',
      default: Duration.minutes(SourceCommand.DEFAULT_WAIT_MINUTES),
      min: Duration.minutes(1),
      description: messages.getMessage('flags.wait'),
      longDescription: messages.getMessage('flagsLong.wait'),
    }),
    manifest: flags.filepath({
      char: 'x',
      description: messages.getMessage('flags.manifest'),
      longDescription: messages.getMessage('flagsLong.manifest'),
      exclusive: ['metadata', 'sourcepath'],
    }),
    metadata: flags.array({
      char: 'm',
      description: messages.getMessage('flags.metadata'),
      longDescription: messages.getMessage('flagsLong.metadata'),
      exclusive: ['manifest', 'sourcepath'],
    }),
    packagenames: flags.array({
      char: 'n',
      description: messages.getMessage('flags.packagename'),
    }),
    tracksource: flags.boolean({
      char: 't',
      description: messages.getMessage('flags.tracksource'),
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
  protected readonly lifecycleEventNames = ['preretrieve', 'postretrieve'];
  protected retrieveResult: RetrieveResult;
  protected tracking: SourceTracking;

  public async run(): Promise<RetrieveCommandResult> {
    await this.preChecks();
    await this.retrieve();
    this.resolveSuccess();
    await this.maybeUpdateTracking();
    return this.formatResult();
  }

  protected async preChecks(): Promise<void> {
    if (this.flags.tracksource) {
      this.tracking = await trackingSetup({
        ux: this.ux,
        org: this.org,
        project: this.project,
        ignoreConflicts: true,
        commandName: 'force:source:retrieve',
      });
    }
  }

  protected async retrieve(): Promise<void> {
    this.ux.startSpinner(spinnerMessages.getMessage('retrieve.componentSetBuild'));
    this.componentSet = await ComponentSetBuilder.build({
      apiversion: this.getFlag<string>('apiversion'),
      sourceapiversion: await this.getSourceApiVersion(),
      packagenames: this.getFlag<string[]>('packagenames'),
      sourcepath: this.getFlag<string[]>('sourcepath'),
      manifest: this.flags.manifest && {
        manifestPath: this.getFlag<string>('manifest'),
        directoryPaths: this.getPackageDirs(),
      },
      metadata: this.flags.metadata && {
        metadataEntries: this.getFlag<string[]>('metadata'),
        directoryPaths: this.getPackageDirs(),
      },
    });

    if (this.getFlag<string>('manifest') || this.getFlag<string>('metadata')) {
      if (this.wantsToRetrieveCustomFields()) {
        this.ux.warn(messages.getMessage('wantsToRetrieveCustomFields'));
        this.componentSet.add({ fullName: ComponentSet.WILDCARD, type: { id: 'customobject', name: 'CustomObject' } });
      }
    }
    if (this.getFlag<boolean>('tracksource')) {
      // will throw if conflicts exist
      if (!this.getFlag<boolean>('forceoverwrite')) {
        await filterConflictsByComponentSet({ tracking: this.tracking, components: this.componentSet, ux: this.ux });
      }

      const remoteDeletes = await this.tracking.getChanges<string>({
        origin: 'remote',
        state: 'delete',
        format: 'string',
      });
      if (remoteDeletes.length) {
        this.ux.warn(messages.getMessage('retrieveWontDelete'));
      }
    }

    await this.lifecycle.emit('preretrieve', this.componentSet.toArray());

    this.ux.setSpinnerStatus(
      spinnerMessages.getMessage('retrieve.sendingRequest', [
        this.componentSet.sourceApiVersion || this.componentSet.apiVersion,
      ])
    );
    const mdapiRetrieve = await this.componentSet.retrieve({
      usernameOrConnection: this.org.getUsername(),
      merge: true,
      output: this.project.getDefaultPackage().fullPath,
      packageOptions: this.getFlag<string[]>('packagenames'),
    });

    this.ux.setSpinnerStatus(spinnerMessages.getMessage('retrieve.polling'));
    this.retrieveResult = await mdapiRetrieve.pollStatus({ timeout: this.getFlag<Duration>('wait') });

    await this.lifecycle.emit('postretrieve', this.retrieveResult.getFileResponses());
    this.ux.stopSpinner();
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
    const projectPath = await SfdxProject.resolveProjectPath();

    this.getFlag<string[]>('packagenames', []).forEach((name) => {
      packages.push({ name, path: join(projectPath, name) });
    });

    const formatterOptions = {
      waitTime: this.getFlag<Duration>('wait').quantity,
      verbose: this.getFlag<boolean>('verbose', false),
      packages,
    };
    const formatter = new RetrieveResultFormatter(this.logger, this.ux, formatterOptions, this.retrieveResult);

    // Only display results to console when JSON flag is unset.
    if (!this.isJsonOutput()) {
      formatter.display();
    }

    return formatter.getJson();
  }

  private async maybeUpdateTracking(): Promise<void> {
    if (this.getFlag<boolean>('tracksource', false)) {
      return updateTracking({ tracking: this.tracking, result: this.retrieveResult, ux: this.ux });
    }
  }

  private wantsToRetrieveCustomFields(): boolean {
    const hasCustomField = this.componentSet.has({
      type: { name: 'CustomField', id: 'customfield' },
      fullName: ComponentSet.WILDCARD,
    });

    const hasCustomObject = this.componentSet.has({
      type: { name: 'CustomObject', id: 'customobject' },
      fullName: ComponentSet.WILDCARD,
    });
    return hasCustomField && !hasCustomObject;
  }
}
