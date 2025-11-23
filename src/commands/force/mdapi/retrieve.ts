/*
 * Copyright 2025, Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Lifecycle, Messages, Org, SfError, SfProject } from '@salesforce/core';
import { Duration } from '@salesforce/kit';
import {
  ComponentSetBuilder,
  MetadataApiRetrieve,
  RequestStatus,
  RetrieveResult,
  RetrieveVersionData,
} from '@salesforce/source-deploy-retrieve';
import { Optional, ensure, ensureString } from '@salesforce/ts-types';
import { Flags, loglevel, requiredOrgFlagWithDeprecations, Ux } from '@salesforce/sf-plugins-core';
import { Interfaces } from '@oclif/core';
import { resolveZipFileName, SourceCommand } from '../../../sourceCommand.js';
import { Stash } from '../../../stash.js';
import {
  RetrieveCommandAsyncResult,
  RetrieveCommandResult,
  RetrieveResultFormatter,
} from '../../../formatters/mdapi/retrieveResultFormatter.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'md.retrieve');
const spinnerMessages = Messages.loadMessages('@salesforce/plugin-source', 'spinner');
const retrieveMessages = Messages.loadMessages('@salesforce/plugin-source', 'retrieve');
export type RetrieveCommandCombinedResult = RetrieveCommandResult | RetrieveCommandAsyncResult;
const replacement = 'project retrieve start';

export class Retrieve extends SourceCommand {
  public static readonly state = 'deprecated';
  public static readonly deprecationOptions = {
    to: replacement,
    message: messages.getMessage('deprecation', [replacement]),
  };
  public static readonly hidden = true;
  public static readonly summary = messages.getMessage('retrieve.summary');
  public static readonly description = messages.getMessage('retrieve.description');
  public static readonly examples = messages.getMessages('retrieve.examples');
  public static readonly flags = {
    loglevel,
    'target-org': requiredOrgFlagWithDeprecations,
    retrievetargetdir: Flags.directory({
      char: 'r',
      summary: messages.getMessage('flags.retrievetargetdir.summary'),
      required: true,
    }),
    unpackaged: Flags.file({
      char: 'k',
      summary: messages.getMessage('flags.unpackaged.summary'),
      exclusive: ['sourcedir', 'packagenames'],
    }),
    sourcedir: Flags.directory({
      char: 'd',
      summary: messages.getMessage('flags.sourcedir.summary'),
      exclusive: ['unpackaged', 'packagenames'],
    }),
    packagenames: Flags.string({
      multiple: true,
      delimiter: ',',
      char: 'p',
      summary: messages.getMessage('flags.packagenames.summary'),
      exclusive: ['sourcedir', 'unpackaged'],
    }),
    singlepackage: Flags.boolean({
      char: 's',
      description: messages.getMessage('flags.singlepackage.description'),
      summary: messages.getMessage('flags.singlepackage.summary'),
    }),
    zipfilename: Flags.string({
      char: 'n',
      summary: messages.getMessage('flags.zipfilename.summary'),
    }),
    unzip: Flags.boolean({
      char: 'z',
      summary: messages.getMessage('flags.unzip.summary'),
    }),
    wait: Flags.duration({
      char: 'w',
      unit: 'minutes',
      summary: messages.getMessage('flags.wait.summary'),
      default: Duration.minutes(1440), // 24 hours is a reasonable default versus -1 (no timeout)
    }),
    apiversion: Flags.string({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore force char override for backward compat
      char: 'a',
      description: messages.getMessage('flags.apiversion.description'),
      summary: messages.getMessage('flags.apiversion.summary'),
    }),
    verbose: Flags.boolean({
      summary: messages.getMessage('flags.verbose.summary'),
    }),
  };

  protected retrieveResult: RetrieveResult | undefined;
  private sourceDir: string | undefined;
  private retrieveTargetDir!: string;
  private zipFileName: string | undefined;
  private unzip: boolean | undefined;
  // will be set to `flags.wait` (which has a default value) when executed.
  private wait!: Duration;
  private isAsync: boolean | undefined;
  private mdapiRetrieve: MetadataApiRetrieve | undefined;
  private flags!: Interfaces.InferredFlags<typeof Retrieve.flags>;
  private org!: Org | undefined;
  public async run(): Promise<RetrieveCommandCombinedResult> {
    this.flags = (await this.parse(Retrieve)).flags;
    this.retrieveTargetDir = this.resolveOutputDir(this.flags.retrievetargetdir);
    this.org = this.flags['target-org'];
    await this.retrieve();
    this.resolveSuccess();
    return this.formatResult();
  }

  protected async retrieve(): Promise<void> {
    const packagenames = this.flags.packagenames;
    if (packagenames === this.unzip && !this.flags.unpackaged) {
      this.sourceDir = this.resolveRootDir(this.flags.sourcedir);
    }
    this.retrieveTargetDir = this.resolveOutputDir(this.flags.retrievetargetdir);
    const manifest = this.resolveManifest(this.flags.unpackaged);
    const singlePackage = this.flags.singlepackage;
    this.zipFileName = resolveZipFileName(this.flags.zipfilename);
    this.unzip = this.flags.unzip;
    const waitFlag = this.flags.wait;
    this.wait = waitFlag.minutes === -1 ? Duration.days(7) : waitFlag;
    this.isAsync = this.wait.quantity === 0;

    if (singlePackage && packagenames?.length) {
      throw new SfError(messages.getMessage('InvalidPackageNames', [packagenames.toString()]), 'InvalidPackageNames');
    }

    this.spinner.start(spinnerMessages.getMessage('retrieve.main', [this.org?.getUsername()]));
    this.spinner.status = spinnerMessages.getMessage('retrieve.componentSetBuild');

    this.componentSet = await ComponentSetBuilder.build({
      // use the apiVersion if provided.
      // Manifests default to their specified apiVersion(ComponentSetBuilder handles this)
      // and not specifying the apiVersion will use the max for the org/Connection
      apiversion: this.flags.apiversion,
      packagenames,
      sourcepath: this.sourceDir ? [this.sourceDir] : undefined,
      manifest: manifest
        ? {
            manifestPath: manifest,
            directoryPaths: [],
          }
        : undefined,
    });

    await Lifecycle.getInstance().emit('preretrieve', { packageXmlPath: manifest });
    const username = this.org?.getUsername() ?? '';
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
    this.spinner.status = spinnerMessages.getMessage('retrieve.sendingRequest');

    this.mdapiRetrieve = await this.componentSet.retrieve({
      usernameOrConnection: username,
      output: this.retrieveTargetDir,
      packageOptions: this.flags.packagenames,
      format: 'metadata',
      singlePackage,
      zipFileName: this.zipFileName,
      unzip: this.unzip,
    });

    Stash.set('MDAPI_RETRIEVE', {
      jobid: this.mdapiRetrieve.id ?? '',
      retrievetargetdir: this.retrieveTargetDir,
      zipfilename: this.zipFileName,
      unzip: this.unzip,
    });

    this.log(`Retrieve ID: ${this.mdapiRetrieve.id ?? ''}`);

    if (this.isAsync) {
      this.spinner.stop('queued');
    } else {
      this.spinner.status = spinnerMessages.getMessage('retrieve.polling');
      this.retrieveResult = await this.mdapiRetrieve.pollStatus({
        frequency: Duration.milliseconds(1000),
        timeout: this.wait,
      });
      this.spinner.stop();
    }
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
    if (!this.isAsync) {
      this.setExitCode(StatusCodeMap.get(this.retrieveResult?.response.status as RequestStatus) ?? 1);
    }
  }

  protected formatResult(): RetrieveCommandResult | RetrieveCommandAsyncResult {
    // async result
    if (this.isAsync) {
      const targetUsername = this.flags['target-org'].getUsername();

      const cmdFlags = `--jobid ${ensureString(this.mdapiRetrieve?.id)} --retrievetargetdir ${this.retrieveTargetDir}${
        targetUsername ? ` --targetusername ${targetUsername}` : ''
      }`;
      this.log('');
      this.log(messages.getMessage('checkStatus', [cmdFlags]));
      return {
        done: false,
        id: this.mdapiRetrieve?.id ?? '',
        state: 'Queued',
        status: 'Queued',
        timedOut: true,
      };
    } else {
      const formatterOptions = {
        waitTime: this.wait.quantity,
        verbose: this.flags.verbose ?? false,
        retrieveTargetDir: this.retrieveTargetDir ?? '',
        zipFileName: this.zipFileName,
        unzip: this.unzip,
      };
      const formatter = new RetrieveResultFormatter(
        new Ux({ jsonEnabled: this.jsonEnabled() }),
        formatterOptions,
        ensure(this.retrieveResult)
      );

      if (!this.jsonEnabled()) {
        formatter.display();
      }
      return formatter.getJson();
    }
  }

  private resolveProjectPath(): string {
    try {
      return SfProject.getInstance().getDefaultPackage().fullPath;
    } catch (error) {
      this.debug('No SFDX project found for default package directory');
    }
    return '';
  }

  private resolveRootDir(rootDir?: string): string {
    return rootDir
      ? this.ensureFlagPath({
          flagName: 'sourcedir',
          path: rootDir,
          type: 'dir',
          throwOnENOENT: true,
        })
      : this.resolveProjectPath();
  }

  private resolveOutputDir(outputDir?: string): string {
    return this.ensureFlagPath({
      flagName: 'retrievetargetdir',
      path: outputDir,
      type: 'dir',
    });
  }

  private resolveManifest(manifestPath?: string): Optional<string> {
    if (manifestPath?.length) {
      return this.ensureFlagPath({
        flagName: 'unpackaged',
        path: manifestPath,
        type: 'file',
        throwOnENOENT: true,
      });
    }
  }
}
