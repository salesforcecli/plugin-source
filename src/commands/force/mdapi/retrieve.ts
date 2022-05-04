/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as os from 'os';
import { extname } from 'path';
import { flags, FlagsConfig } from '@salesforce/command';
import { Messages, SfdxError, SfdxProject } from '@salesforce/core';
import { Duration } from '@salesforce/kit';
import {
  ComponentSetBuilder,
  MetadataApiRetrieve,
  RequestStatus,
  RetrieveResult,
} from '@salesforce/source-deploy-retrieve';
import { Optional } from '@salesforce/ts-types';
import { SourceCommand } from '../../../sourceCommand';
import { Stash } from '../../../stash';
import {
  RetrieveCommandAsyncResult,
  RetrieveCommandResult,
  RetrieveResultFormatter,
} from '../../../formatters/mdapi/retrieveResultFormatter';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'md.retrieve');
const spinnerMessages = Messages.loadMessages('@salesforce/plugin-source', 'spinner');

export class Retrieve extends SourceCommand {
  public static aliases = ['force:mdapi:beta:retrieve'];
  public static readonly description = messages.getMessage('retrieveCmd.description');
  public static readonly examples = messages.getMessage('retrieveCmd.examples').split(os.EOL);
  public static readonly requiresUsername = true;
  public static readonly flagsConfig: FlagsConfig = {
    retrievetargetdir: flags.directory({
      char: 'r',
      description: messages.getMessage('flags.retrievetargetdir'),
      longDescription: messages.getMessage('flagsLong.retrievetargetdir'),
      required: true,
    }),
    unpackaged: flags.filepath({
      char: 'k',
      description: messages.getMessage('flags.unpackaged'),
      longDescription: messages.getMessage('flagsLong.unpackaged'),
      exclusive: ['sourcedir', 'packagenames'],
    }),
    sourcedir: flags.directory({
      char: 'd',
      description: messages.getMessage('flags.sourcedir'),
      longDescription: messages.getMessage('flagsLong.sourcedir'),
      exclusive: ['unpackaged', 'packagenames'],
    }),
    packagenames: flags.array({
      char: 'p',
      description: messages.getMessage('flags.packagenames'),
      longDescription: messages.getMessage('flagsLong.packagenames'),
      exclusive: ['sourcedir', 'unpackaged'],
    }),
    singlepackage: flags.boolean({
      char: 's',
      description: messages.getMessage('flags.singlepackage'),
      longDescription: messages.getMessage('flagsLong.singlepackage'),
    }),
    zipfilename: flags.string({
      char: 'n',
      description: messages.getMessage('flags.zipfilename'),
      longDescription: messages.getMessage('flagsLong.zipfilename'),
    }),
    unzip: flags.boolean({
      char: 'z',
      description: messages.getMessage('flags.unzip'),
      longDescription: messages.getMessage('flagsLong.unzip'),
    }),
    wait: flags.minutes({
      char: 'w',
      description: messages.getMessage('flags.wait'),
      longDescription: messages.getMessage('flagsLong.wait'),
      default: Duration.minutes(1440), // 24 hours is a reasonable default versus -1 (no timeout)
    }),
    apiversion: flags.builtin({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore force char override for backward compat
      char: 'a',
      description: messages.getMessage('flags.apiversion'),
      longDescription: messages.getMessage('flagsLong.apiversion'),
    }),
    verbose: flags.builtin({
      description: messages.getMessage('flags.verbose'),
      longDescription: messages.getMessage('flagsLong.verbose'),
    }),
  };

  protected retrieveResult: RetrieveResult;
  private sourceDir: string;
  private retrieveTargetDir: string;
  private zipFileName: string;
  private unzip: boolean;
  private wait: Duration;
  private isAsync: boolean;
  private mdapiRetrieve: MetadataApiRetrieve;

  public async run(): Promise<RetrieveCommandResult | RetrieveCommandAsyncResult> {
    await this.retrieve();
    this.resolveSuccess();
    return this.formatResult();
  }

  protected async retrieve(): Promise<void> {
    const packagenames = this.getFlag<string[]>('packagenames');
    if (!packagenames) {
      this.sourceDir = this.resolveRootDir(this.getFlag<string>('sourcedir'));
    }
    this.retrieveTargetDir = this.resolveOutputDir(this.getFlag<string>('retrievetargetdir'));
    const manifest = this.resolveManifest(this.getFlag<string>('unpackaged'));
    const singlePackage = this.getFlag<boolean>('singlepackage');
    this.zipFileName = this.resolveZipFileName(this.getFlag<string>('zipfilename'));
    this.unzip = this.getFlag<boolean>('unzip');
    this.wait = this.getFlag<Duration>('wait');
    this.isAsync = this.wait.quantity === 0;

    if (singlePackage && packagenames?.length > 1) {
      throw SfdxError.create('@salesforce/plugin-source', 'md.retrieve', 'InvalidPackageNames', [
        packagenames.toString(),
      ]);
    }

    this.ux.startSpinner(spinnerMessages.getMessage('retrieve.main', [this.org.getUsername()]));
    this.ux.setSpinnerStatus(spinnerMessages.getMessage('retrieve.componentSetBuild'));

    this.componentSet = await ComponentSetBuilder.build({
      apiversion: this.getFlag<string>('apiversion'),
      packagenames,
      sourcepath: this.sourceDir ? [this.sourceDir] : undefined,
      manifest: manifest && {
        manifestPath: manifest,
        directoryPaths: [],
      },
    });

    await this.lifecycle.emit('preretrieve', { packageXmlPath: manifest });

    this.ux.setSpinnerStatus(spinnerMessages.getMessage('retrieve.sendingRequest', [this.componentSet.apiVersion]));

    this.mdapiRetrieve = await this.componentSet.retrieve({
      usernameOrConnection: this.org.getUsername(),
      output: this.retrieveTargetDir,
      packageOptions: this.getFlag<string[]>('packagenames'),
      format: 'metadata',
      singlePackage,
      zipFileName: this.zipFileName,
      unzip: this.unzip,
    });

    Stash.set('MDAPI_RETRIEVE', {
      jobid: this.mdapiRetrieve.id,
      retrievetargetdir: this.retrieveTargetDir,
      zipfilename: this.zipFileName,
      unzip: this.unzip,
    });

    this.ux.log(`Retrieve ID: ${this.mdapiRetrieve.id}`);

    if (this.isAsync) {
      this.ux.stopSpinner('queued');
    } else {
      this.ux.setSpinnerStatus(spinnerMessages.getMessage('retrieve.polling'));
      this.retrieveResult = await this.mdapiRetrieve.pollStatus(1000, this.wait.seconds);
      this.ux.stopSpinner();
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
      this.setExitCode(StatusCodeMap.get(this.retrieveResult.response.status) ?? 1);
    }
  }

  protected formatResult(): RetrieveCommandResult | RetrieveCommandAsyncResult {
    // async result
    if (this.isAsync) {
      let cmdFlags = `--jobid ${this.mdapiRetrieve.id} --retrievetargetdir ${this.retrieveTargetDir}`;
      const targetusernameFlag = this.getFlag<string>('targetusername');
      if (targetusernameFlag) {
        cmdFlags += ` --targetusername ${targetusernameFlag}`;
      }
      this.ux.log('');
      this.ux.log(messages.getMessage('checkStatus', [cmdFlags]));
      return {
        done: false,
        id: this.mdapiRetrieve.id,
        state: 'Queued',
        status: 'Queued',
        timedOut: true,
      };
    } else {
      const formatterOptions = {
        waitTime: this.wait.quantity,
        verbose: this.getFlag<boolean>('verbose', false),
        retrieveTargetDir: this.retrieveTargetDir,
        zipFileName: this.zipFileName,
        unzip: this.unzip,
      };
      const formatter = new RetrieveResultFormatter(this.logger, this.ux, formatterOptions, this.retrieveResult);

      if (!this.isJsonOutput()) {
        formatter.display();
      }
      return formatter.getJson();
    }
  }

  private resolveZipFileName(zipFileName?: string): string {
    // If no file extension was provided append, '.zip'
    if (zipFileName && !extname(zipFileName)) {
      zipFileName += '.zip';
    }
    return zipFileName || 'unpackaged.zip';
  }

  private resolveProjectPath(): string {
    try {
      return SfdxProject.getInstance().getDefaultPackage().fullPath;
    } catch (error) {
      this.logger.debug('No SFDX project found for default package directory');
    }
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
