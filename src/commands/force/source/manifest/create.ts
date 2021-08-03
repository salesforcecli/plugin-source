/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as os from 'os';
import { join } from 'path';
import { flags, FlagsConfig } from '@salesforce/command';
import { fs } from '@salesforce/core';
import { Messages } from '@salesforce/core';
import { SourceCommand } from '../../../../sourceCommand';
import { ComponentSetBuilder } from '../../../../componentSetBuilder';

Messages.importMessagesDirectory(__dirname);
const deployMessages = Messages.loadMessages('@salesforce/plugin-source', 'deploy');
const messages = Messages.loadMessages('@salesforce/plugin-source', 'create');

const manifestTypes: Record<string, string> = {
  pre: 'destructiveChangesPre.xml',
  post: 'destructiveChangesPost.xml',
  destroy: 'destructiveChanges.xml',
  package: 'package.xml',
};

interface CreateResult {
  name: string;
  path: string;
}

export class create extends SourceCommand {
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessage('examples').split(os.EOL);
  public static readonly requiresProject = true;
  public static readonly flagsConfig: FlagsConfig = {
    metadata: flags.array({
      char: 'm',
      description: deployMessages.getMessage('flags.metadata'),
      exclusive: ['sourcepath'],
    }),
    sourcepath: flags.array({
      char: 'p',
      description: deployMessages.getMessage('flags.sourcePath'),
      exclusive: ['metadata'],
    }),
    manifestname: flags.string({
      char: 'n',
      description: messages.getMessage('flags.manifestname'),
      default: 'package.xml',
      exclusive: ['manifesttype'],
    }),
    manifesttype: flags.enum({
      description: messages.getMessage('flags.manifesttype'),
      options: ['pre', 'post', 'package', 'destroy'],
      char: 't',
    }),
    outputdir: flags.string({
      char: 'o',
      description: messages.getMessage('flags.outputdir'),
    }),
  };
  public requiredFlags = ['metadata', 'sourcepath'];
  private manifestname: string;
  private outputdir: string;

  public async run(): Promise<CreateResult> {
    await this.createManifest();
    this.resolveSuccess();
    return this.formatResult();
  }

  protected async createManifest(): Promise<void> {
    this.validateFlags(Object.keys(this.flags));
    // get the official manifest name, if no matches, check the manifestname flag, if not passed, default to 'package.xml'
    this.manifestname =
      manifestTypes[this.getFlag<string>('manifesttype')] || this.getFlag<string>('manifestname') || 'package.xml';
    this.outputdir = this.getFlag<string>('outputdir');

    const componentSet = await ComponentSetBuilder.build({
      sourcepath: this.getFlag<string[]>('sourcepath'),
      metadata: this.flags.metadata && {
        metadataEntries: this.getFlag<string[]>('metadata'),
        directoryPaths: this.getPackageDirs(),
      },
    });

    // automatically add the .xml suffix if the user just provided a file name
    let outputPath = this.manifestname.endsWith('xml') ? this.manifestname : this.manifestname + '.xml';

    if (this.outputdir) {
      fs.mkdirSync(this.outputdir, { recursive: true });
      outputPath = join(this.outputdir, outputPath);
    }

    await fs.writeFile(outputPath, componentSet.getPackageXml());
  }
  // noop this method because any errors will be reported by the createManifest method
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  protected resolveSuccess(): void {}

  protected formatResult(): CreateResult {
    if (!this.isJsonOutput()) {
      if (this.outputdir) {
        // if the user specified a different outputdir
        this.ux.log(`successfully wrote ${this.manifestname} to ${this.outputdir}`);
      } else {
        this.ux.log(`successfully wrote ${this.manifestname}`);
      }
    }
    return { path: this.outputdir, name: this.manifestname };
  }
}
