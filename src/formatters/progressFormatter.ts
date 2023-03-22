/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { MetadataApiDeploy } from '@salesforce/source-deploy-retrieve';
import { Ux } from '@salesforce/sf-plugins-core';

export abstract class ProgressFormatter {
  public ux: Ux;

  public constructor(ux: Ux) {
    this.ux = ux;
  }

  public abstract progress(deploy: MetadataApiDeploy): void;
}
