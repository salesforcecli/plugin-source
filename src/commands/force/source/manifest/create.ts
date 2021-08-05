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
      description: messages.getMessage('flags.metadata'),
      exclusive: ['sourcepath'],
    }),
    sourcepath: flags.array({
      char: 'p',
      description: messages.getMessage('flags.sourcepath'),
      exclusive: ['metadata'],
    }),
    manifestname: flags.string({
      char: 'n',
      description: messages.getMessage('flags.manifestname'),
      exclusive: ['manifesttype'],
    }),
    manifesttype: flags.enum({
      description: messages.getMessage('flags.manifesttype'),
      options: Object.keys(manifestTypes),
      char: 't',
    }),
    outputdir: flags.string({
      char: 'o',
      description: messages.getMessage('flags.outputdir'),
    }),
  };
  public requiredFlags = ['metadata', 'sourcepath'];
  private manifestName: string;
  private outputDir: string;
  private outputPath: string;

  public async run(): Promise<CreateResult> {
    await this.createManifest();
    this.resolveSuccess();
    return this.formatResult();
  }

  protected async createManifest(): Promise<void> {
    this.validateFlags(Object.keys(this.flags));
    // convert the manifesttype into one of the "official" manifest names
    // if no manifesttype flag passed, use the manifestname flag
    // if no manifestname flag, default to 'package.xml'
    this.manifestName =
      manifestTypes[this.getFlag<string>('manifesttype')] || this.getFlag<string>('manifestname') || 'package.xml';
    this.outputDir = this.getFlag<string>('outputdir');

    const componentSet = await ComponentSetBuilder.build({
      sourcepath: this.getFlag<string[]>('sourcepath'),
      metadata: this.flags.metadata && {
        metadataEntries: this.getFlag<string[]>('metadata'),
        directoryPaths: this.getPackageDirs(),
      },
    });

    // add the .xml suffix if the user just provided a file name
    this.manifestName = this.manifestName.endsWith('.xml') ? this.manifestName : this.manifestName + '.xml';

    if (this.outputDir) {
      fs.mkdirSync(this.outputDir, { recursive: true });
      this.outputPath = join(this.outputDir, this.manifestName);
    } else {
      this.outputPath = this.manifestName;
    }

    await fs.writeFile(this.outputPath, componentSet.getPackageXml());
  }
  // noop this method because any errors will be reported by the createManifest method
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  protected resolveSuccess(): void {}

  protected formatResult(): CreateResult {
    if (!this.isJsonOutput()) {
      if (this.outputDir) {
        this.ux.log(messages.getMessage('successOutputDir', [this.manifestName, this.outputDir]));
      } else {
        this.ux.log(messages.getMessage('success', [this.manifestName]));
      }
    }
    return { path: this.outputPath, name: this.manifestName };
  }
}
