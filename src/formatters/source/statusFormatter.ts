/*
 * Copyright 2025, Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Messages } from '@salesforce/core';
import { Ux } from '@salesforce/sf-plugins-core';
import { ResultFormatter, ResultFormatterOptions } from '../resultFormatter.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'status');

type StatusActualState = 'Deleted' | 'Add' | 'Changed' | 'Unchanged';
export type StatusOrigin = 'Local' | 'Remote';
export type StatusStateString =
  | `${StatusOrigin} ${StatusActualState}`
  | `${StatusOrigin} ${StatusActualState} (Conflict)`;
export type StatusResult = {
  state: StatusStateString;
  fullName: string;
  type: string;
  filePath?: string;
  ignored?: boolean;
  conflict?: boolean;
  actualState?: StatusActualState;
  origin: StatusOrigin;
};

// sort order is state, type, fullname
const rowSortFunction = (a: StatusResult, b: StatusResult): number => {
  if (a.state.toLowerCase() === b.state.toLowerCase()) {
    if (a.type.toLowerCase() === b.type.toLowerCase()) {
      return a.fullName.toLowerCase() < b.fullName.toLowerCase() ? -1 : 1;
    }
    return a.type.toLowerCase() < b.type.toLowerCase() ? -1 : 1;
  }
  return a.state.toLowerCase() < b.state.toLowerCase() ? -1 : 1;
};

export const exitCodeAsNumber = (): number | undefined => {
  try {
    return typeof process.exitCode === 'string' ? parseInt(process.exitCode, 10) : process.exitCode;
  } catch {
    // it *could* be a string that fails to parse to int?
    return undefined;
  }
};

export class StatusFormatter extends ResultFormatter {
  public constructor(ux: Ux, options: ResultFormatterOptions, private statusRows: StatusResult[]) {
    super(ux, options);
  }

  public getJson(): StatusResult[] {
    return this.statusRows;
  }

  public display(): void {
    if (this.options.concise) {
      this.statusRows = this.statusRows.filter((row) => row.ignored === false);
    }
    if (this.statusRows.length === 0) {
      this.ux.log(messages.getMessage('noResults'));
      return;
    }
    this.ux.log(messages.getMessage('humanSuccess'));
    this.ux.table(this.statusRows.sort(rowSortFunction), {
      ...(this.statusRows.some((row) => row.ignored) ? { ignored: { header: 'IGNORED' } } : {}),
      state: { header: 'STATE' },
      fullName: { header: 'FULL NAME' },
      type: { header: 'TYPE' },
      filePath: { header: 'PROJECT PATH' },
    });
  }
}
