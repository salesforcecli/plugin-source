/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as os from 'os';
import { flags, FlagsConfig, SfdxCommand } from '@salesforce/command';
import { Messages } from '@salesforce/core';
import {
  ChangeResult,
  replaceRenamedCommands,
  SourceTracking,
  StatusOutputRow,
  throwIfInvalid,
} from '@salesforce/source-tracking';
import { StatusFormatter, StatusResult } from '../../../../formatters/source/statusFormatter';

Messages.importMessagesDirectory(__dirname);
const messages: Messages = Messages.loadMessages('@salesforce/plugin-source', 'status');

export default class Status extends SfdxCommand {
  public static description = messages.getMessage('description');
  public static readonly examples = replaceRenamedCommands(messages.getMessage('examples')).split(os.EOL);
  protected static flagsConfig: FlagsConfig = {
    local: flags.boolean({
      char: 'l',
      description: messages.getMessage('flags.local'),
      longDescription: messages.getMessage('flags.localLong'),
      exclusive: ['remote'],
    }),
    remote: flags.boolean({
      char: 'r',
      description: messages.getMessage('flags.remote'),
      longDescription: messages.getMessage('flags.remoteLong'),
      exclusive: ['local'],
    }),
    concise: flags.builtin({
      description: messages.getMessage('flags.concise'),
    }),
  };
  protected static requiresUsername = true;
  protected static requiresProject = true;
  protected results = new Array<StatusResult>();
  protected localAdds: ChangeResult[] = [];

  public async run(): Promise<StatusResult[]> {
    throwIfInvalid({
      org: this.org,
      projectPath: this.project.getPath(),
      toValidate: 'plugin-source',
      command: replaceRenamedCommands('force:source:status'),
    });

    const wantsLocal = (this.flags.local as boolean) || (!this.flags.remote && !this.flags.local);
    const wantsRemote = (this.flags.remote as boolean) || (!this.flags.remote && !this.flags.local);

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
    const stlStatusResult = await tracking.getStatus({ local: wantsLocal, remote: wantsRemote });
    this.results = stlStatusResult.map((result) => resultConverter(result));

    return this.formatResult();
  }

  protected formatResult(): StatusResult[] {
    const formatter = new StatusFormatter(
      this.logger,
      this.ux,
      { concise: this.flags.concise as boolean },
      this.results
    );

    if (!this.flags.json) {
      formatter.display();
    }

    return formatter.getJson();
  }
}

/**
 * STL provides a more useful json output.
 * This function makes it consistent with the Status command's json.
 */
const resultConverter = (input: StatusOutputRow): StatusResult => {
  const { fullName, type, ignored, filePath, conflict } = input;
  const origin = originMap.get(input.origin);
  const actualState = stateMap.get(input.state);
  return {
    fullName,
    type,
    // this string became the place to store information.
    // The JSON now breaks out that info but preserves this property for backward compatibility
    state: `${origin} ${actualState}${conflict ? ' (Conflict)' : ''}`,
    ignored,
    filePath,
    origin,
    actualState,
    conflict,
  };
};

const originMap = new Map<StatusOutputRow['origin'], StatusResult['origin']>([
  ['local', 'Local'],
  ['remote', 'Remote'],
]);

const stateMap = new Map<StatusOutputRow['state'], StatusResult['actualState']>([
  ['delete', 'Deleted'],
  ['add', 'Add'],
  ['modify', 'Changed'],
  ['nondelete', 'Changed'],
]);
