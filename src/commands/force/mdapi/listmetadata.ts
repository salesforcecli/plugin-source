/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { flags, FlagsConfig } from '@salesforce/command';
import { Messages, SfdxError } from '@salesforce/core';
import { Optional } from '@salesforce/ts-types';
import { FileProperties, ListMetadataQuery } from 'jsforce';
import { SourceCommand } from '../../../sourceCommand';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'md.list');

export type ListMetadataCommandResult = FileProperties[];

interface FsError extends Error {
  code: string;
}

export class ListMetadata extends SourceCommand {
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessage('examples').split(os.EOL);
  public static readonly requiresUsername = true;
  public static readonly flagsConfig: FlagsConfig = {
    apiversion: flags.builtin({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore force char override for backward compat
      char: 'a',
      description: messages.getMessage('flags.apiversion'),
      longDescription: messages.getMessage('flagsLong.apiversion'),
    }),
    resultfile: flags.filepath({
      char: 'f',
      description: messages.getMessage('flags.resultfile'),
      longDescription: messages.getMessage('flagsLong.resultfile'),
    }),
    metadatatype: flags.string({
      char: 'm',
      description: messages.getMessage('flags.metadatatype'),
      longDescription: messages.getMessage('flagsLong.metadatatype'),
      required: true,
    }),
    folder: flags.string({
      description: messages.getMessage('flags.folder'),
      longDescription: messages.getMessage('flagsLong.folder'),
    }),
  };

  private listResult: Optional<FileProperties[]>;
  private targetFilePath: string;

  public async run(): Promise<ListMetadataCommandResult> {
    await this.list();
    this.resolveSuccess();
    return this.formatResult();
  }

  protected async list(): Promise<void> {
    const apiversion = this.getFlag<string>('apiversion');
    const type = this.getFlag<string>('metadatatype');
    const folder = this.getFlag<string>('folder');

    this.validateResultFile();

    const query: ListMetadataQuery = { type, folder };
    const connection = this.org.getConnection();
    const result = (await connection.metadata.list(query, apiversion)) || [];
    this.listResult = Array.isArray(result) ? result : [result];
  }

  // No-op implementation since any list metadata status would be a success.
  // The only time this command would report an error is if it failed
  // flag parsing or some error during the request, and those are captured
  // by the command framework.
  /* eslint-disable-next-line @typescript-eslint/no-empty-function */
  protected resolveSuccess(): void {}

  protected formatResult(): ListMetadataCommandResult {
    if (this.targetFilePath) {
      fs.writeFileSync(this.targetFilePath, JSON.stringify(this.listResult, null, 2));
      this.ux.log(`Wrote result file to ${this.targetFilePath}.`);
    } else if (!this.isJsonOutput()) {
      if (this.listResult.length) {
        this.ux.styledJSON(this.listResult);
      } else {
        this.ux.log(messages.getMessage('noMatchingMetadata', [this.getFlag('metadatatype'), this.org.getUsername()]));
      }
    }
    return this.listResult;
  }

  private validateResultFile(): void {
    if (this.flags.resultfile) {
      this.targetFilePath = path.resolve(this.getFlag('resultfile'));
      // Ensure path exists
      fs.mkdirSync(path.dirname(this.targetFilePath), { recursive: true });
      try {
        const stat = fs.statSync(this.targetFilePath);
        if (!stat.isFile()) {
          throw SfdxError.create('@salesforce/plugin-source', 'md.list', 'invalidResultFile', [this.targetFilePath]);
        }
      } catch (err: unknown) {
        const e = err as FsError;
        if (e.code !== 'ENOENT') {
          throw err;
        }
      }
    }
  }
}
