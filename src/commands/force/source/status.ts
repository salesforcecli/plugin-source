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
import {
  StatusFormatter,
  StatusOrigin,
  StatusResult,
  StatusStateString,
} from '../../../formatters/source/statusFormatter.js';
import { trackingSetup } from '../../../trackingFunctions.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'status');

export type StatusCommandResult = StatusResult[];

const replacement = 'project retrieve/deploy preview';
export default class Status extends SfCommand<StatusCommandResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly examples = messages.getMessages('examples');
  public static readonly state = 'deprecated';
  public static readonly hidden = true;
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
      summary: messages.getMessage('flags.local.summary'),
      exclusive: ['remote'],
    }),
    remote: Flags.boolean({
      char: 'r',
      summary: messages.getMessage('flags.remote.summary'),
      exclusive: ['local'],
    }),
    concise: Flags.boolean({
      summary: messages.getMessage('flags.concise.summary'),
    }),
  };
  public static readonly requiresProject = true;
  protected results = new Array<StatusResult>();
  protected localAdds: ChangeResult[] = [];
  private flags!: Interfaces.InferredFlags<typeof Status.flags>;

  public async run(): Promise<StatusCommandResult> {
    this.flags = (await this.parse(Status)).flags;
    const tracking = await trackingSetup({
      ignoreConflicts: true,
      org: this.flags['target-org'],
      project: this.project!,
      ux: new Ux({ jsonEnabled: this.jsonEnabled() }),
    });

    const wantsLocal = this.flags.local || (!this.flags.remote && !this.flags.local);
    const wantsRemote = this.flags.remote || (!this.flags.remote && !this.flags.local);

    this.debug(
      `project is ${this.project!.getPath()} and pkgDirs are ${this.project!.getPackageDirectories()
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
  const origin = originMap.get(input.origin) as StatusOrigin;
  const actualState = stateMap.get(input.state);
  return {
    fullName,
    type,
    // this string became the place to store information.
    // The JSON now breaks out that info but preserves this property for backward compatibility
    state: `${origin} ${actualState as string}${conflict ? ' (Conflict)' : ''}` as StatusStateString,
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
