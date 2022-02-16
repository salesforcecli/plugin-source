/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as os from 'os';
import * as fs from 'fs';
import { flags, FlagsConfig } from '@salesforce/command';
import { Messages } from '@salesforce/core';
import { DescribeMetadataResult } from 'jsforce';
import { RegistryAccess } from '@salesforce/source-deploy-retrieve';
import { SourceCommand } from '../../../sourceCommand';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'md.describe');

export class DescribeMetadata extends SourceCommand {
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
    filterknown: flags.boolean({
      char: 'k',
      description: messages.getMessage('flags.filterknown'),
      longDescription: messages.getMessage('flagsLong.filterknown'),
      hidden: true,
    }),
  };

  private describeResult: DescribeMetadataResult;
  private targetFilePath: string;

  public async run(): Promise<DescribeMetadataResult> {
    await this.describe();
    this.resolveSuccess();
    return this.formatResult();
  }

  protected async describe(): Promise<void> {
    const apiversion = this.getFlag<string>('apiversion');
    const resultfile = this.getFlag<string>('resultfile');

    if (resultfile) {
      this.targetFilePath = this.ensureFlagPath({ flagName: 'resultfile', path: resultfile, type: 'file' });
    }

    const connection = this.org.getConnection();
    this.describeResult = await connection.metadata.describe(apiversion);

    if (this.flags.filterknown) {
      this.logger.debug('Filtering for only metadata types unregistered in the CLI');
      const registry = new RegistryAccess();
      this.describeResult.metadataObjects = this.describeResult.metadataObjects.filter((md) => {
        try {
          // An error is thrown when a type can't be found by name, and we want
          // the ones that can't be found.
          registry.getTypeByName(md.xmlName);
          return false;
        } catch (e) {
          return true;
        }
      });
    }
  }

  // No-op implementation since any describe metadata status would be a success.
  // The only time this command would report an error is if it failed
  // flag parsing or some error during the request, and those are captured
  // by the command framework.
  /* eslint-disable-next-line @typescript-eslint/no-empty-function */
  protected resolveSuccess(): void {}

  protected formatResult(): DescribeMetadataResult {
    if (this.targetFilePath) {
      fs.writeFileSync(this.targetFilePath, JSON.stringify(this.describeResult, null, 2));
      this.ux.log(`Wrote result file to ${this.targetFilePath}.`);
    } else if (!this.isJsonOutput()) {
      this.ux.styledJSON(this.describeResult);
    }
    return this.describeResult;
  }
}
