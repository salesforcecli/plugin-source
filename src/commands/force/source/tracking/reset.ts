/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Messages } from '@salesforce/core';
import * as chalk from 'chalk';
import { SourceTracking, throwIfInvalid } from '@salesforce/source-tracking';
import {
  Flags,
  loglevel,
  orgApiVersionFlagWithDeprecations,
  requiredOrgFlagWithDeprecations,
  SfCommand,
} from '@salesforce/sf-plugins-core';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'tracking');

export type SourceTrackingResetResult = {
  sourceMembersSynced: number;
  localPathsSynced: number;
};

export class Reset extends SfCommand<SourceTrackingResetResult> {
  public static readonly deprecateAliases = true;
  public static aliases = ['force:source:beta:tracking:reset'];
  public static readonly summary = messages.getMessage('resetDescription');
  public static readonly description = messages.getMessage('resetDescription');
  public static readonly requiresProject = true;
  public static readonly examples = [];

  public static readonly flags = {
    'target-org': requiredOrgFlagWithDeprecations,
    'api-version': orgApiVersionFlagWithDeprecations,
    loglevel,
    revision: Flags.integer({
      char: 'r',
      summary: messages.getMessage('revisionDescription'),
      min: 0,
    }),
    noprompt: Flags.boolean({
      char: 'p',
      summary: messages.getMessage('nopromptDescription'),
    }),
  };

  public async run(): Promise<SourceTrackingResetResult> {
    const { flags } = await this.parse(Reset);
    throwIfInvalid({
      org: flags['target-org'],
      projectPath: this.project.getPath(),
      toValidate: 'plugin-source',
      command: 'force:source:tracking:clear',
    });

    if (flags.noprompt || (await this.confirm(chalk.dim(messages.getMessage('promptMessage'))))) {
      const sourceTracking = await SourceTracking.create({
        project: this.project,
        org: flags['target-org'],
      });

      const [remoteResets, localResets] = await Promise.all([
        sourceTracking.resetRemoteTracking(flags.revision),
        sourceTracking.resetLocalTracking(),
      ]);

      this.log(`Reset local tracking files${flags.revision ? ` to revision ${flags.revision}` : ''}.`);

      return {
        sourceMembersSynced: remoteResets,
        localPathsSynced: localResets.length,
      };
    }

    return {
      sourceMembersSynced: 0,
      localPathsSynced: 0,
    };
  }
}
