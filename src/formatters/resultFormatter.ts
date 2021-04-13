/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { AnyJson } from '@salesforce/ts-types';

export interface FormattedResult<T = AnyJson> {}

export interface ResultFormatter {
  getJson<T = AnyJson>(): FormattedResult<T>;
  display(): void;
}
