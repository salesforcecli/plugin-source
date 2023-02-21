/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { join } from 'path';
import * as fs from 'fs';
import { Messages } from '@salesforce/core';
import { ComponentSetBuilder } from '@salesforce/source-deploy-retrieve';
import { Flags, loglevel, orgApiVersionFlagWithDeprecations } from '@salesforce/sf-plugins-core';
import { Interfaces } from '@oclif/core';
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
export class Create extends SourceCommand {
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly requiresProject = true;
  public static readonly flags = {
    'api-version': orgApiVersionFlagWithDeprecations,
    loglevel,
    metadata: Flags.string({
      multiple: true,
      char: 'm',
      description: messages.getMessage('flags.metadata'),
      exactlyOne: xorFlags,
    }),
    sourcepath: Flags.string({
      multiple: true,
      char: 'p',
      description: messages.getMessage('flags.sourcepath'),
      exactlyOne: xorFlags,
    }),
    manifestname: Flags.string({
      char: 'n',
      description: messages.getMessage('flags.manifestname'),
      exclusive: ['manifesttype'],
    }),
    manifesttype: Flags.string({
      description: messages.getMessage('flags.manifesttype'),
      options: Object.keys(manifestTypes),
      char: 't',
    }),
    includepackages: Flags.string({
      multiple: true,
      description: messages.getMessage('flags.includepackages'),
      options: Object.keys(packageTypes),
      char: 'c',
      dependsOn: ['fromorg'],
    }),
    fromorg: Flags.string({
      description: messages.getMessage('flags.fromorg'),
      exactlyOne: xorFlags,
    }),
    outputdir: Flags.string({
      char: 'o',
      description: messages.getMessage('flags.outputdir'),
    }),
  };
  private manifestName: string;
  private outputDir: string;
  private outputPath: string;
  private includepackages: string[];
  private flags: Interfaces.InferredFlags<typeof Create.flags>;

  public async run(): Promise<CreateCommandResult> {
    this.flags = (await this.parse(Create)).flags;
    await this.createManifest();
    this.resolveSuccess();
    return this.formatResult();
  }

  protected async createManifest(): Promise<void> {
    // convert the manifesttype into one of the "official" manifest names
    // if no manifesttype flag passed, use the manifestname flag
    // if no manifestname flag, default to 'package.xml'
    this.manifestName = manifestTypes[this.flags.manifesttype] || this.flags.manifestname || 'package.xml';
    this.outputDir = this.flags.outputdir;
    this.includepackages = this.flags.includepackages;

    let exclude: string[] = [];
    if (this.includepackages) {
      Object.keys(packageTypes).forEach(
        (type) => (exclude = !this.includepackages.includes(type) ? exclude.concat(packageTypes[type]) : exclude)
      );
    } else {
      exclude = Object.values(packageTypes).flat();
    }

    const componentSet = await ComponentSetBuilder.build({
      apiversion: this.flags['api-version'] ?? (await this.getSourceApiVersion()),
      sourcepath: this.flags.sourcepath,
      metadata: this.flags.metadata && {
        metadataEntries: this.flags.metadata,
        directoryPaths: this.getPackageDirs(),
      },
      org: this.flags.fromorg && {
        username: this.flags.fromorg,
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
  // eslint-disable-next-line @typescript-eslint/no-empty-function, class-methods-use-this
  protected resolveSuccess(): void {}

  protected formatResult(): CreateCommandResult {
    if (!this.jsonEnabled()) {
      if (this.outputDir) {
        this.log(messages.getMessage('successOutputDir', [this.manifestName, this.outputDir]));
      } else {
        this.log(messages.getMessage('success', [this.manifestName]));
      }
    }
    return { path: this.outputPath, name: this.manifestName };
  }
}
