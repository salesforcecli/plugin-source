/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as os from 'os';
import { FlagsConfig, flags, SfdxCommand } from '@salesforce/command';
import { Messages } from '@salesforce/core';

import {
  SourceTracking,
  throwIfInvalid,
  replaceRenamedCommands,
  getKeyFromObject,
  getKeyFromStrings,
  ChangeResult,
} from '@salesforce/source-tracking';

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
        localAdds.flatMap((item) => this.statusResultToOutputRows(item, 'add')),
        localModifies.flatMap((item) => this.statusResultToOutputRows(item, 'changed')),
        localDeletes.flatMap((item) => this.statusResultToOutputRows(item, 'delete'))
      );
    }

    if (wantsRemote) {
      // by initializeWithQuery true, one query runs so that parallel getChanges aren't doing parallel queries
      await tracking.ensureRemoteTracking(true);
      const [remoteDeletes, remoteModifies] = await Promise.all([
        tracking.getChanges<ChangeResult>({ origin: 'remote', state: 'delete', format: 'ChangeResult' }),
        tracking.getChanges<ChangeResult>({ origin: 'remote', state: 'nondelete', format: 'ChangeResult' }),
      ]);
      this.results = this.results.concat(
        remoteDeletes.flatMap((item) => this.statusResultToOutputRows(item)),
        remoteModifies.flatMap((item) => this.statusResultToOutputRows(item))
      );
    }

    if (wantsLocal && wantsRemote) {
      // keys like ApexClass__MyClass.cls
      const conflictKeys = (await tracking.getConflicts()).map((conflict) => getKeyFromObject(conflict));
      if (conflictKeys.length > 0) {
        this.results = this.results.map((row) =>
          conflictKeys.includes(getKeyFromStrings(row.type, row.fullName))
            ? { ...row, state: `${row.state} (Conflict)` }
            : row
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

  private statusResultToOutputRows(input: ChangeResult, localType?: 'delete' | 'changed' | 'add'): StatusResult[] {
    this.logger.debug('converting ChangeResult to a row', input);

    const state = (): string => {
      if (localType) {
        return localType[0].toUpperCase() + localType.substring(1);
      }
      if (input.deleted) {
        return 'Delete';
      }
      if (input.modified) {
        return 'Changed';
      }
      return 'Add';
    };
    const baseObject = {
      type: input.type ?? '',
      state: `${input.origin} ${state()}`,
      fullName: input.name ?? '',
    };
    this.logger.debug(baseObject);

    if (!input.filenames) {
      return [baseObject];
    }
    return input.filenames.map((filename) => ({
      ...baseObject,
      filepath: filename,
    }));
  }
}
