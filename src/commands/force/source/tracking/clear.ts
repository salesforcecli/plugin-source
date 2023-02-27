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

export type SourceTrackingClearResult = {
  clearedFiles: string[];
};

export class Clear extends SfCommand<SourceTrackingClearResult> {
  public static readonly deprecateAliases = true;
  public static aliases = ['force:source:beta:tracking:clear'];
  public static readonly summary = messages.getMessage('clearDescription');
  public static readonly description = messages.getMessage('clearDescription');
  public static readonly requiresProject = true;
  public static readonly examples = [];

  public static readonly flags = {
    'api-version': orgApiVersionFlagWithDeprecations,
    loglevel,
    'target-org': requiredOrgFlagWithDeprecations,
    noprompt: Flags.boolean({
      char: 'p',
      summary: messages.getMessage('nopromptDescription'),
      required: false,
    }),
  };

  public async run(): Promise<SourceTrackingClearResult> {
    const { flags } = await this.parse(Clear);
    throwIfInvalid({
      org: flags['target-org'],
      projectPath: this.project.getPath(),
      toValidate: 'plugin-source',
      command: 'force:source:tracking:clear',
    });
    let clearedFiles: string[] = [];
    if (flags.noprompt || (await this.confirm(chalk.dim(messages.getMessage('promptMessage'))))) {
      const sourceTracking = await SourceTracking.create({
        project: this.project,
        org: flags['target-org'],
      });
      clearedFiles = await Promise.all([sourceTracking.clearLocalTracking(), sourceTracking.clearRemoteTracking()]);
      this.log('Cleared local tracking files.');
    }
    return { clearedFiles };
  }
}
