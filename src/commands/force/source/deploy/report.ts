/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Messages } from '@salesforce/core';
import { flags, FlagsConfig } from '@salesforce/command';
import { Duration } from '@salesforce/kit';
import { DeployResult } from '@salesforce/source-deploy-retrieve';
import { SourceCommand } from '../../../../sourceCommand';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'report');

export class Report extends SourceCommand {
  public static readonly description = messages.getMessage('description');
  public static readonly requiresUsername = true;
  public static readonly flagsConfig: FlagsConfig = {
    wait: flags.minutes({
      char: 'w',
      default: Duration.minutes(SourceCommand.DEFAULT_SRC_WAIT_MINUTES),
      min: Duration.minutes(1),
      description: messages.getMessage('flags.wait'),
    }),
    jobid: flags.id({
      char: 'i',
      description: messages.getMessage('flags.jobid'),
    }),
  };

  public async run(): Promise<DeployResult> {
    return await this.deployReport(this.flags.jobid);
  }
}
