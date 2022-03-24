/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as os from 'os';
import { join } from 'path';
import * as fs from 'fs';
import { flags, FlagsConfig } from '@salesforce/command';
import { Messages } from '@salesforce/core';
import { ComponentSetBuilder } from '@salesforce/source-deploy-retrieve';
import { SourceCommand } from '../../../../sourceCommand';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'create');

const manifestTypes: Record<string, string> = {
  pre: 'destructiveChangesPre.xml',
  post: 'destructiveChangesPost.xml',
  destroy: 'destructiveChanges.xml',
  package: 'package.xml',
};

const packageTypes: Record<string, string[]> = {
  managed: ['beta', 'deleted', 'deprecated', 'installed', 'released'],
  unlocked: ['deprecatedEditable', 'installedEditable'],
};

interface CreateCommandResult {
  name: string;
  path: string;
}

const xorFlags = ['metadata', 'sourcepath', 'fromorg'];
export class create extends SourceCommand {
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessage('examples').split(os.EOL);
  public static readonly requiresProject = true;
  public static readonly flagsConfig: FlagsConfig = {
    apiversion: flags.builtin({}),
    metadata: flags.array({
      char: 'm',
      description: messages.getMessage('flags.metadata'),
      exactlyOne: xorFlags,
    }),
    sourcepath: flags.array({
      char: 'p',
      description: messages.getMessage('flags.sourcepath'),
      exactlyOne: xorFlags,
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
    includepackages: flags.array({
      description: messages.getMessage('flags.includepackages'),
      options: Object.keys(packageTypes),
      char: 'c',
      dependsOn: ['fromorg'],
    }),
    fromorg: flags.string({
      description: messages.getMessage('flags.fromorg'),
      exactlyOne: xorFlags,
    }),
    outputdir: flags.string({
      char: 'o',
      description: messages.getMessage('flags.outputdir'),
    }),
  };
  private manifestName: string;
  private outputDir: string;
  private outputPath: string;
  private includepackages: string[];

  public async run(): Promise<CreateCommandResult> {
    await this.createManifest();
    this.resolveSuccess();
    return this.formatResult();
  }

  protected async createManifest(): Promise<void> {
    // convert the manifesttype into one of the "official" manifest names
    // if no manifesttype flag passed, use the manifestname flag
    // if no manifestname flag, default to 'package.xml'
    this.manifestName =
      manifestTypes[this.getFlag<string>('manifesttype')] || this.getFlag<string>('manifestname') || 'package.xml';
    this.outputDir = this.getFlag<string>('outputdir');
    this.includepackages = this.getFlag<string[]>('includepackages');

    let exclude: string[] = [];
    if (this.includepackages) {
      Object.keys(packageTypes).forEach(
        (type) => (exclude = !this.includepackages.includes(type) ? exclude.concat(packageTypes[type]) : exclude)
      );
    } else {
      exclude = Object.values(packageTypes).flat();
    }

    const componentSet = await ComponentSetBuilder.build({
      apiversion: this.getFlag('apiversion') ?? (await this.getSourceApiVersion()),
      sourcepath: this.getFlag<string[]>('sourcepath'),
      metadata: this.flags.metadata && {
        metadataEntries: this.getFlag<string[]>('metadata'),
        directoryPaths: this.getPackageDirs(),
      },
      org: this.flags.fromorg && {
        username: this.getFlag<string>('fromorg'),
        exclude,
      },
    });

    // add the .xml suffix if the user just provided a file name
    this.manifestName = this.manifestName.endsWith('.xml') ? this.manifestName : this.manifestName + '.xml';

    if (this.outputDir) {
      await fs.promises.mkdir(this.outputDir, { recursive: true });
      this.outputPath = join(this.outputDir, this.manifestName);
    } else {
      this.outputPath = this.manifestName;
    }

    return fs.promises.writeFile(this.outputPath, await componentSet.getPackageXml());
  }

  // noop this method because any errors will be reported by the createManifest method
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  protected resolveSuccess(): void {}

  protected formatResult(): CreateCommandResult {
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
