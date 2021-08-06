/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { resolve } from 'path';
import { UX } from '@salesforce/command';
import { Logger, Messages, SfdxError } from '@salesforce/core';
import { ConvertResult } from 'SDR';
import { ResultFormatter } from './resultFormatter';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'convert');

export interface ConvertCommandResult {
  location: string;
}

export class ConvertResultFormatter extends ResultFormatter {
  protected result: ConvertResult;

  public constructor(logger: Logger, ux: UX, result: ConvertResult) {
    super(logger, ux);
    this.result = result;
  }

  public getJson(): ConvertCommandResult {
    return {
      location: resolve(this.result.packagePath),
    };
  }

  public display(): void {
    if (this.isSuccess()) {
      this.ux.log(messages.getMessage('success', [this.result.packagePath]));
    } else {
      throw new SfdxError(messages.getMessage('convertFailed'), 'ConvertFailed');
    }
  }
}
