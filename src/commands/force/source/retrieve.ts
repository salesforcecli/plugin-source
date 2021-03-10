/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as os from 'os';
import { join, sep } from 'path';
import { flags, FlagsConfig } from '@salesforce/command';
import { Messages, SfdxError, SfdxProjectJson } from '@salesforce/core';
import { Duration } from '@salesforce/kit';
import { asArray, asString, Dictionary } from '@salesforce/ts-types';
import { blue } from 'chalk';
import { FileResponse, MetadataApiRetrieveStatus } from '@salesforce/source-deploy-retrieve';
import { FileProperties } from '@salesforce/source-deploy-retrieve/lib/src/client/types';
import { SourceCommand } from '../../../sourceCommand';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'retrieve');

interface WorkspaceElementObj {
  state: string;
  fullName: string;
  type: string;
  filePath: string;
  deleteSupported: boolean;
}
interface MetadataInfo {
  mdapiFilePath: string[];
}
interface SourceInfo {
  workspaceElements: WorkspaceElementObj[];
}
type MetadataResult = Dictionary<MetadataInfo>;
type SourceResult = Dictionary<SourceInfo>;

export class retrieve extends SourceCommand {
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessage('examples').split(os.EOL);
  public static readonly requiresProject = true;
  public static readonly requiresUsername = true;
  public static readonly flagsConfig: FlagsConfig = {
    sourcepath: flags.array({
      char: 'p',
      description: messages.getMessage('flags.sourcePath'),
      exclusive: ['manifest', 'metadata'],
    }),
    wait: flags.minutes({
      char: 'w',
      default: Duration.minutes(SourceCommand.DEFAULT_SRC_WAIT_MINUTES),
      min: SourceCommand.MINIMUM_SRC_WAIT_MINUTES,
      description: messages.getMessage('flags.wait'),
    }),
    manifest: flags.filepath({
      char: 'x',
      description: messages.getMessage('flags.manifest'),
      exclusive: ['metadata', 'sourcepath'],
    }),
    metadata: flags.array({
      char: 'm',
      description: messages.getMessage('flags.metadata'),
      exclusive: ['manifest', 'sourcepath'],
    }),
    packagenames: flags.array({
      char: 'n',
      description: messages.getMessage('flags.packagename'),
    }),
  };
  protected readonly lifecycleEventNames = ['preretrieve', 'postretrieve', 'postsourceupdate'];

  public async run(): Promise<MetadataApiRetrieveStatus> {
    const proj = await SfdxProjectJson.create({});
    const packages = await proj.getPackageDirectories();
    const defaultPackage = packages.find((pkg) => pkg.default);

    const cs = await this.createComponentSet({
      // safe to cast from the flags as an array of strings
      packagenames: asArray<string>(this.flags.packagenames),
      sourcepath: asArray<string>(this.flags.sourcepath),
      manifest: asString(this.flags.manifest),
      metadata: asArray<string>(this.flags.metadata),
    });

    await this.hookEmitter.emit('preretrieve', { packageXmlPath: `${this.tmpDir}${sep}package.xml` });

    const mdapiResult = await cs
      .retrieve({
        usernameOrConnection: this.org.getUsername(),
        merge: true,
        output: (this.flags.sourcepath as string) ?? defaultPackage.path,
        packageNames: asArray<string>(this.flags.packagenames),
      })
      .start();

    const results = mdapiResult.response;
    await this.emitPostRetrieveHook(asArray(results.fileProperties));
    // with the library the source update is happening in real time
    await this.emitPostSourceUpdateHook(mdapiResult.getFileResponses());

    if (results.status === 'InProgress') {
      throw new SfdxError(messages.getMessage('retrieveTimeout', [(this.flags.wait as Duration).minutes]));
    }

    if (this.flags.json) {
      this.ux.logJson(mdapiResult.getFileResponses());
    } else {
      this.printTable(results, true);
    }

    return results;
  }

  /**
   * to print the results table of successes, failures, partial failures
   *
   * @param results what the .deploy or .retrieve method returns
   * @param withoutState a boolean to add state, default to true
   */
  public printTable(results: MetadataApiRetrieveStatus, withoutState?: boolean): void {
    const stateCol = withoutState ? [] : [{ key: 'state', label: 'STATE' }];

    this.ux.styledHeader(blue(messages.getMessage('retrievedSourceHeader')));
    if (results.success) {
      const columns = [
        { key: 'fullName', label: 'FULL NAME' },
        { key: 'type', label: 'TYPE' },
        { key: 'fileName', label: 'PROJECT PATH' },
      ];
      this.ux.table(results.fileProperties as FileProperties[], { columns: [...stateCol, ...columns] });
    } else {
      this.ux.log(messages.getMessage('NoResultsFound'));
    }
  }

  private async emitPostRetrieveHook(fileProperties: FileProperties[]): Promise<void> {
    const postRetrieveHookData: MetadataResult = {};

    fileProperties.forEach((fileProperty) => {
      const { fullName, fileName } = fileProperty;

      if (!(typeof postRetrieveHookData[fullName] === 'object')) {
        postRetrieveHookData[fullName] = {
          mdapiFilePath: [],
        };
      }

      postRetrieveHookData[fullName].mdapiFilePath.push(join(this.tmpDir, fileName));
    });
    await this.hookEmitter.emit('postretrieve', postRetrieveHookData);
  }

  private async emitPostSourceUpdateHook(fileProperties: FileResponse[]): Promise<void> {
    const postSourceUpdateHookInfo: SourceResult = {};

    fileProperties.forEach((file) => {
      const fullName = file.fullName;

      if (!postSourceUpdateHookInfo[fullName]) {
        postSourceUpdateHookInfo[fullName] = {
          workspaceElements: [],
        };
      }

      postSourceUpdateHookInfo[fullName].workspaceElements.push({
        state: file?.state[0]?.toLowerCase(),
        fullName: file.fullName,
        type: file.type,
        filePath: file.filePath,
        // TODO: don't hard code this.
        deleteSupported: true,
      });
    });
    await this.hookEmitter.emit('postsourceupdate', postSourceUpdateHookInfo);
  }
}
