/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as os from 'os';
import { join } from 'path';
import { flags, FlagsConfig } from '@salesforce/command';
import { fs, SfdxError } from '@salesforce/core';
import { Messages } from '@salesforce/core';
import { SourceCommand } from '../../../../sourceCommand';
import { ComponentSetBuilder } from '../../../../componentSetBuilder';

Messages.importMessagesDirectory(__dirname);
const deployMessages = Messages.loadMessages('@salesforce/plugin-source', 'deploy');
const messages = Messages.loadMessages('@salesforce/plugin-source', 'generate');

// One of these flags must be specified for a valid deploy.
const requiredFlags = ['metadata', 'sourcepath'];

export class generate extends SourceCommand {
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessage('examples').split(os.EOL);
  public static readonly requiresProject = true;
  public static readonly flagsConfig: FlagsConfig = {
    metadata: flags.array({
      char: 'm',
      description: deployMessages.getMessage('flags.metadata'),
      exclusive: ['manifest', 'sourcepath'],
    }),
    sourcepath: flags.array({
      char: 'p',
      description: deployMessages.getMessage('flags.sourcePath'),
      exclusive: ['manifest', 'metadata'],
    }),
    name: flags.string({
      char: 'n',
      description: messages.getMessage('flags.name'),
      default: 'package.xml',
    }),
    outputdir: flags.string({
      char: 'o',
      description: messages.getMessage('flags.outputdir'),
      default: '.',
    }),
  };
  private name: string;
  private outputdir: string;

  public async run(): Promise<{ path: string }> {
    // verify that the user defined one of:  metadata, sourcepath
    if (!Object.keys(this.flags).some((flag) => requiredFlags.includes(flag))) {
      throw SfdxError.create('@salesforce/plugin-source', 'deploy', 'MissingRequiredParam', [requiredFlags.join(', ')]);
    }
    await this.generateManifest();
    this.resolveSuccess();
    return this.formatResult();
  }

  protected async generateManifest(): Promise<void> {
    this.name = this.getFlag<string>('name');
    this.outputdir = this.getFlag<string>('outputdir');
    const componentSet = await ComponentSetBuilder.build({
      apiversion: this.getFlag<string>('apiversion'),
      sourceapiversion: await this.getSourceApiVersion(),
      sourcepath: this.getFlag<string[]>('sourcepath'),
      metadata: this.flags.metadata && {
        metadataEntries: this.getFlag<string[]>('metadata'),
        directoryPaths: this.getPackageDirs(),
      },
    });

    // automatically add the .xml suffix if the user just provided a file name
    this.name = this.name.endsWith('xml') ? this.name : this.name + '.xml';
    if (this.outputdir !== '.') {
      fs.mkdirSync(this.outputdir);
    }

    this.outputdir = join(this.outputdir, this.name);

    await fs.writeFile(this.outputdir, componentSet.getPackageXml());
  }
  // noop this method because any errors will be reported by the generateManifest method
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  protected resolveSuccess(): void {}

  protected formatResult(): { path: string } {
    if (!this.isJsonOutput()) {
      if (this.outputdir !== '.') {
        // if the user specified a different outputdir
        this.ux.log(`successfully wrote ${this.name} to ${this.outputdir}`);
      } else {
        this.ux.log(`succesfully wrote ${this.name}`);
      }
    }
    return { path: this.outputdir };
  }
}
