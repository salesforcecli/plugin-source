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

import { Messages, SfError } from '@salesforce/core';
import { get } from '@salesforce/ts-types';
import {
  MetadataApiRetrieveStatus,
  RequestStatus,
  RetrieveMessage,
  RetrieveResult,
} from '@salesforce/source-deploy-retrieve';

import { ensureArray } from '@salesforce/kit';
import { Ux } from '@salesforce/sf-plugins-core';
import chalk from 'chalk';
import { ResultFormatter, ResultFormatterOptions } from './resultFormatter.js';
Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);

export abstract class RetrieveFormatter extends ResultFormatter {
  protected warnings: RetrieveMessage[];
  protected result: MetadataApiRetrieveStatus;
  protected messages = Messages.loadMessages('@salesforce/plugin-source', 'retrieve');

  protected constructor(ux: Ux, public options: ResultFormatterOptions, result: RetrieveResult) {
    super(ux, options);
    // zipFile can become massive and unwieldy with JSON parsing/terminal output and, isn't useful
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    delete result.response.zipFile;
    this.result = result.response;

    // grab warnings
    this.warnings = ensureArray(result?.response?.messages ?? []);
  }

  protected hasStatus(status: RequestStatus): boolean {
    return this.result?.status === status;
  }

  protected displayWarnings(): void {
    this.ux.styledHeader(chalk.yellow(this.messages.getMessage('retrievedSourceWarningsHeader')));
    this.ux.table(this.warnings, { fileName: { header: 'FILE NAME' }, problem: { header: 'PROBLEM' } });
    this.ux.log();
  }

  protected displayErrors(): void {
    // an invalid packagename retrieval will end up with a message in the `errorMessage` entry
    const errorMessage = get(this.result, 'errorMessage') as string;
    if (errorMessage) {
      throw new SfError(errorMessage);
    }
    const unknownMsg: RetrieveMessage[] = [{ fileName: 'unknown', problem: 'unknown' }];
    const responseMsgs = get(this.result, 'messages', unknownMsg) as RetrieveMessage | RetrieveMessage[];
    const errMsgs = ensureArray(responseMsgs);
    const errMsgsForDisplay = errMsgs.reduce<string>((p, c) => `${p}\n${c.fileName}: ${c.problem}`, '');
    this.ux.log(`Retrieve Failed due to: ${errMsgsForDisplay}`);
  }
}
