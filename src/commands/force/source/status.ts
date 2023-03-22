/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Messages } from '@salesforce/core';
import { ChangeResult, StatusOutputRow } from '@salesforce/source-tracking';
import { Interfaces } from '@oclif/core';
import {
  Flags,
  loglevel,
  orgApiVersionFlagWithDeprecations,
  requiredOrgFlagWithDeprecations,
  SfCommand,
  Ux,
} from '@salesforce/sf-plugins-core';
import { StatusFormatter, StatusResult } from '../../../formatters/source/statusFormatter';
import { trackingSetup } from '../../../trackingFunctions';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'status');

export type StatusCommandResult = StatusResult[];

const replacement = 'project retrieve/deploy preview';
export default class Status extends SfCommand<StatusCommandResult> {
  public static readonly summary = messages.getMessage('description');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly state = 'deprecated';
  public static readonly deprecationOptions = {
    to: replacement,
    message: messages.getMessage('deprecation', [replacement]),
  };
  public static readonly flags = {
    'api-version': orgApiVersionFlagWithDeprecations,
    loglevel,
    'target-org': requiredOrgFlagWithDeprecations,
    local: Flags.boolean({
      char: 'l',
      description: messages.getMessage('flags.local'),
      summary: messages.getMessage('flags.localLong'),
      exclusive: ['remote'],
    }),
    remote: Flags.boolean({
      char: 'r',
      description: messages.getMessage('flags.remote'),
      summary: messages.getMessage('flags.remoteLong'),
      exclusive: ['local'],
    }),
    concise: Flags.boolean({
      summary: messages.getMessage('flags.concise'),
    }),
  };
  public static readonly requiresProject = true;
  protected results = new Array<StatusResult>();
  protected localAdds: ChangeResult[] = [];
  private flags: Interfaces.InferredFlags<typeof Status.flags>;

  public async run(): Promise<StatusCommandResult> {
    this.flags = (await this.parse(Status)).flags;
    const tracking = await trackingSetup({
      commandName: 'force:source:status',
      ignoreConflicts: true,
      org: this.flags['target-org'],
      project: this.project,
      ux: new Ux({ jsonEnabled: this.jsonEnabled() }),
    });

    const wantsLocal = this.flags.local || (!this.flags.remote && !this.flags.local);
    const wantsRemote = this.flags.remote || (!this.flags.remote && !this.flags.local);

    this.debug(
      `project is ${this.project.getPath()} and pkgDirs are ${this.project
        .getPackageDirectories()
        .map((dir) => dir.path)
        .join(',')}`
    );

    const stlStatusResult = await tracking.getStatus({ local: wantsLocal, remote: wantsRemote });
    this.results = stlStatusResult.map((result) => resultConverter(result));

    return this.formatResult();
  }

  protected formatResult(): StatusResult[] {
    const formatter = new StatusFormatter(
      new Ux({ jsonEnabled: this.jsonEnabled() }),
      { concise: this.flags.concise },
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
