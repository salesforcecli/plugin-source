/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { UX } from '@salesforce/command';
import { Logger } from '@salesforce/core';
import { getBoolean, getNumber } from '@salesforce/ts-types';

export interface ResultFormatterOptions {
  verbose?: boolean;
  waitTime?: number;
}

export abstract class ResultFormatter {
  public logger: Logger;
  public ux: UX;
  public options: ResultFormatterOptions;

  public constructor(logger: Logger, ux: UX, options: ResultFormatterOptions = {}) {
    this.logger = logger;
    this.ux = ux;
    this.options = options;
  }

  // Command success is determined by the command so it can set the
  // exit code on the process, which is done before formatting.
  public isSuccess(): boolean {
    return getNumber(process, 'exitCode', 0) === 0;
  }

  public isVerbose(): boolean {
    return getBoolean(this.options, 'verbose', false);
  }

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  public abstract getJson(): any;
  public abstract display(): void;
}
