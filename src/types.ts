/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

export interface FsError extends Error {
  code: string;
}

export interface EnsureFsFlagOptions {
  flagName: string;
  path: string;
  type: 'dir' | 'file' | 'any';
  throwOnENOENT?: boolean;
}

export type ProgressBar = {
  total?: number;
  value?: number;
  start: (total: number, startValue: number, payload?: object) => void;
  update: (num: number, payload?: object) => void;
  setTotal: (num: number) => void;
  stop: () => void;
};
