/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { UX } from '@salesforce/command';
import { Logger, Messages, SfdxError } from '@salesforce/core';
import { ResultFormatter } from './resultFormatter';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'open');

export interface OpenCommandResult {
  url: string;
  orgId: string;
  username: string;
}

export class OpenResultFormatter extends ResultFormatter {
  protected result: OpenCommandResult;

  public constructor(logger: Logger, ux: UX, result: OpenCommandResult) {
    super(logger, ux);
    this.result = result;
  }

  public getJson(): OpenCommandResult {
    return this.result;
  }

  public display(): void {
    if (this.isSuccess()) {
      const { orgId, username, url } = this.result;
      this.ux.log(messages.getMessage('SourceOpenCommandHumanSuccess', [orgId, username, url]));
    } else {
      throw new SfdxError(messages.getMessage('SourceOpenCommandError'), 'OpenFailed');
    }
  }
}
