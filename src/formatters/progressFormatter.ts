/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { UX } from '@salesforce/command';
import { Logger } from '@salesforce/core';
import { MetadataApiDeploy } from '@salesforce/source-deploy-retrieve';

export abstract class ProgressFormatter {
  public logger: Logger;
  public ux: UX;

  public constructor(logger: Logger, ux: UX) {
    this.logger = logger;
    this.ux = ux;
  }

  public abstract progress(deploy: MetadataApiDeploy): void;
}
