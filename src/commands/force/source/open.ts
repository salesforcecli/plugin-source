/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as os from 'os';
import { flags, FlagsConfig } from '@salesforce/command';
import { SfdxCommand } from '@salesforce/command';
import { Messages } from '@salesforce/core';

export interface OpenCommandResult {
  url: string;
}

export interface UrlObject {
  url: string;
  orgId: string;
  username: string;
}

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'open');

export class Open extends SfdxCommand {
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessage('examples').split(os.EOL);
  public static readonly requiresProject = true;
  public static readonly requiresUsername = true;
  public static readonly flagsConfig: FlagsConfig = {
    sourcefile: flags.filepath({
      char: 'f',
      required: true,
      hidden: false,
      description: messages.getMessage('SourceOpenFileDescription'),
      longDescription: messages.getMessage('SourceOpenFileLongDescription'),
    }),
    urlonly: flags.boolean({
      char: 'r',
      required: false,
      hidden: false,
      description: messages.getMessage('SourceOpenPathDescription'),
      longDescription: messages.getMessage('SourceOpenPathLongDescription'),
    }),
  };

  public async run(): Promise<OpenCommandResult> {
    const doWork = new Promise<string>((resolve) => {
      setTimeout(() => {
        return resolve('finish');
      }, 1500);
    });
    this.ux.warn('flags: ' + JSON.stringify(this.flags, null, 2));
    return {
      url: await doWork,
    };
  }
}
