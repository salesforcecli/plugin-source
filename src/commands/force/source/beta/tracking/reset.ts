/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { flags, FlagsConfig, SfdxCommand } from '@salesforce/command';
import { Messages } from '@salesforce/core';
import * as chalk from 'chalk';
import { SourceTracking, throwIfInvalid, replaceRenamedCommands } from '@salesforce/source-tracking';

Messages.importMessagesDirectory(__dirname);
const messages: Messages = Messages.loadMessages('@salesforce/plugin-source', 'tracking');

export type SourceTrackingResetResult = {
  sourceMembersSynced: number;
  localPathsSynced: number;
};

export class Reset extends SfdxCommand {
  public static readonly description = replaceRenamedCommands(messages.getMessage('resetDescription'));

  public static readonly requiresProject = true;
  public static readonly requiresUsername = true;

  public static readonly flagsConfig: FlagsConfig = {
    revision: flags.integer({
      char: 'r',
      description: messages.getMessage('revisionDescription'),
      min: 0,
    }),
    noprompt: flags.boolean({
      char: 'p',
      description: messages.getMessage('nopromptDescription'),
    }),
  };

  public async run(): Promise<SourceTrackingResetResult> {
    throwIfInvalid({
      org: this.org,
      projectPath: this.project.getPath(),
      toValidate: 'plugin-source',
      command: replaceRenamedCommands('force:source:tracking:clear'),
    });

    if (
      this.flags.noprompt ||
      (await this.ux.confirm(chalk.dim(replaceRenamedCommands(messages.getMessage('promptMessage')))))
    ) {
      const sourceTracking = await SourceTracking.create({
        project: this.project,
        org: this.org,
        apiVersion: this.flags.apiversion as string,
      });

      const [remoteResets, localResets] = await Promise.all([
        sourceTracking.resetRemoteTracking(this.flags.revision as number),
        sourceTracking.resetLocalTracking(),
      ]);

      this.ux.log(
        `Reset local tracking files${this.flags.revision ? ` to revision ${this.flags.revision as number}` : ''}.`
      );

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
