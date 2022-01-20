/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { EOL } from 'os';
import { UX } from '@salesforce/command';
import { Logger, Messages } from '@salesforce/core';
import { AsyncResult } from '@salesforce/source-deploy-retrieve';
import { ResultFormatterOptions } from '../resultFormatter';
import { DeployAsyncResultFormatter } from '../source/deployAsyncResultFormatter';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'md.deploy');

export class MdDeployAsyncResultFormatter extends DeployAsyncResultFormatter {
  protected result: AsyncResult;

  public constructor(logger: Logger, ux: UX, options: ResultFormatterOptions, result: AsyncResult) {
    super(logger, ux, options, result);
    this.result = result;
  }

  /**
   * Displays async deploy results in human format.
   */
  public display(): void {
    this.ux.log(messages.getMessage('asyncDeployQueued'), EOL);
    this.ux.log(messages.getMessage('asyncDeployCancel', [this.result.id, this.options.username]));
    this.ux.log(messages.getMessage('asyncDeployReport', [this.result.id, this.options.username]));
  }
}
