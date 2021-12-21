/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { SfdxError } from '@salesforce/core';

export const isValidDeployId = (id: string): boolean => {
  if (id.startsWith('0Af')) {
    return true;
  } else {
    throw SfdxError.create('@salesforce/plugin-source', 'deploy', 'invalidDeployId');
  }
};
