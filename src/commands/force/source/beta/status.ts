/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as os from 'os';
import { FlagsConfig, flags, SfdxCommand } from '@salesforce/command';
import { Messages } from '@salesforce/core';
import { SourceTracking, throwIfInvalid, replaceRenamedCommands, ChangeResult } from '@salesforce/source-tracking';
import { ForceIgnore, RegistryAccess, SourceComponent } from '@salesforce/source-deploy-retrieve';
import { MetadataTransformerFactory } from '@salesforce/source-deploy-retrieve/lib/src/convert/transformers/metadataTransformerFactory';
import { ConvertContext } from '@salesforce/source-deploy-retrieve/lib/src/convert/convertContext';
import { StatusResult, StatusFormatter } from '../../../../formatters/statusFormatter';

Messages.importMessagesDirectory(__dirname);
const messages: Messages = Messages.loadMessages('@salesforce/plugin-source', 'status');

export default class SourceStatus extends SfdxCommand {
  public static description = messages.getMessage('description');
  public static readonly examples = replaceRenamedCommands(messages.getMessage('examples')).split(os.EOL);
  protected static flagsConfig: FlagsConfig = {
    all: flags.boolean({
      char: 'a',
      description: messages.getMessage('flags.all'),
      longDescription: messages.getMessage('flags.allLong'),
    }),
    local: flags.boolean({
      char: 'l',
      description: messages.getMessage('flags.local'),
      longDescription: messages.getMessage('flags.localLong'),
    }),
    remote: flags.boolean({
      char: 'r',
      description: messages.getMessage('flags.remote'),
      longDescription: messages.getMessage('flags.remoteLong'),
    }),
  };
  protected static requiresUsername = true;
  protected static requiresProject = true;
  protected hidden = true;
  protected results = new Array<StatusResult>();
  protected localAdds: ChangeResult[] = [];

  private registry: RegistryAccess;
  private transformerFactory: MetadataTransformerFactory;
  private forceIgnore: ForceIgnore;

  public async run(): Promise<StatusResult[]> {
    throwIfInvalid({
      org: this.org,
      projectPath: this.project.getPath(),
      toValidate: 'plugin-source',
      command: replaceRenamedCommands('force:source:status'),
    });
    const wantsLocal =
      (this.flags.local as boolean) || (this.flags.all as boolean) || (!this.flags.remote && !this.flags.all);
    const wantsRemote =
      (this.flags.remote as boolean) || (this.flags.all as boolean) || (!this.flags.local && !this.flags.all);

    this.logger.debug(
      `project is ${this.project.getPath()} and pkgDirs are ${this.project
        .getPackageDirectories()
        .map((dir) => dir.path)
        .join(',')}`
    );
    const tracking = await SourceTracking.create({
      org: this.org,
      project: this.project,
      apiVersion: this.flags.apiversion as string,
    });

    if (wantsLocal) {
      await tracking.ensureLocalTracking();
      const localDeletes = tracking.populateTypesAndNames({
        elements: await tracking.getChanges<ChangeResult>({ origin: 'local', state: 'delete', format: 'ChangeResult' }),
        excludeUnresolvable: true,
        resolveDeleted: true,
      });

      const localAdds = tracking.populateTypesAndNames({
        elements: await tracking.getChanges<ChangeResult>({ origin: 'local', state: 'add', format: 'ChangeResult' }),
        excludeUnresolvable: true,
      });

      const localModifies = tracking.populateTypesAndNames({
        elements: await tracking.getChanges<ChangeResult>({ origin: 'local', state: 'modify', format: 'ChangeResult' }),
        excludeUnresolvable: true,
      });

      this.results = this.results.concat(
        localAdds.flatMap((item) => this.localChangesToOutputRow(item, 'add')),
        localModifies.flatMap((item) => this.localChangesToOutputRow(item, 'changed')),
        localDeletes.flatMap((item) => this.localChangesToOutputRow(item, 'delete'))
      );
    }

    if (wantsRemote) {
      // by initializeWithQuery true, one query runs so that parallel getChanges aren't doing parallel queries
      await tracking.ensureRemoteTracking(true);
      const [remoteDeletes, remoteModifies] = await Promise.all([
        tracking.getChanges<ChangeResult>({ origin: 'remote', state: 'delete', format: 'ChangeResult' }),
        tracking.getChanges<ChangeResult>({ origin: 'remote', state: 'nondelete', format: 'ChangeResultWithPaths' }),
      ]);
      this.results = this.results.concat(
        (
          await Promise.all(remoteDeletes.concat(remoteModifies).map((item) => this.remoteChangesToOutputRows(item)))
        ).flat(1)
      );
    }

    if (wantsLocal && wantsRemote) {
      // keys like ApexClass__MyClass.cls
      const conflictFiles = (await tracking.getConflicts()).flatMap((conflict) => conflict.filenames);
      if (conflictFiles.length > 0) {
        this.results = this.results.map((row) =>
          row.filePath && conflictFiles.includes(row.filePath) ? { ...row, state: `${row.state} (Conflict)` } : row
        );
      }
    }

    return this.formatResult();
  }

  protected formatResult(): StatusResult[] {
    const formatter = new StatusFormatter(this.logger, this.ux, {}, this.results);

    if (!this.flags.json) {
      formatter.display();
    }

    return formatter.getJson();
  }

  // TODO: This goes in SDR on SourceComponent
  // we don't have a local copy of the component
  // this uses SDR's approach to determine what the filePath would be if the component were written locally
  private async filesPathFromNonLocalSourceComponent({
    fullName,
    typeName,
  }: {
    fullName: string;
    typeName: string;
  }): Promise<string[]> {
    this.registry = this.registry ?? new RegistryAccess();
    const component = new SourceComponent({ name: fullName, type: this.registry.getTypeByName(typeName) });
    this.transformerFactory =
      this.transformerFactory ?? new MetadataTransformerFactory(new RegistryAccess(), new ConvertContext());
    const transformer = this.transformerFactory.getTransformer(component);
    const writePaths = await transformer.toSourceFormat(component);
    return writePaths.map((writePath) => writePath.output);
  }

  private localChangesToOutputRow(input: ChangeResult, localType: 'delete' | 'changed' | 'add'): StatusResult[] {
    this.logger.debug('converting ChangeResult to a row', input);
    this.forceIgnore = this.forceIgnore ?? new ForceIgnore();

    const baseObject = {
      type: input.type ?? '',
      state: `${input.origin} ${localType[0].toUpperCase() + localType.substring(1)}`,
      fullName: input.name ?? '',
    };

    return input.filenames.map((filename) => ({
      ...baseObject,
      filePath: filename,
      ignored: this.forceIgnore.denies(filename),
    }));
  }

  private async remoteChangesToOutputRows(input: ChangeResult): Promise<StatusResult[]> {
    this.logger.debug('converting ChangeResult to a row', input);
    this.forceIgnore = this.forceIgnore ?? new ForceIgnore();
    const baseObject = {
      type: input.type ?? '',
      state: `${input.origin} ${this.stateFromChangeResult(input)}`,
      fullName: input.name ?? '',
    };
    // it's easy to check ignores if the filePaths exist locally
    if (input.filenames?.length) {
      return input.filenames.map((filename) => ({
        ...baseObject,
        filePath: filename,
        ignored: this.forceIgnore.denies(filename),
      }));
    }
    // when the file doesn't exist locally, there are no filePaths.
    // we can determine where the filePath *would* go using SDR's transformers stuff
    const fakeFilePaths = await this.filesPathFromNonLocalSourceComponent({
      fullName: baseObject.fullName,
      typeName: baseObject.type,
    });
    return [{ ...baseObject, ignored: fakeFilePaths.some((path) => this.forceIgnore.denies(path)) }];
  }

  private stateFromChangeResult(input: ChangeResult): string {
    if (input.deleted) {
      return 'Delete';
    }
    if (input.modified) {
      return 'Changed';
    }
    return 'Add';
  }
}
