/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as os from 'os';
import { join, resolve } from 'path';
import * as fs from 'fs';
import { flags, FlagsConfig } from '@salesforce/command';
import { Messages, SfdxError } from '@salesforce/core';
import { MetadataConverter, ConvertResult } from '@salesforce/source-deploy-retrieve';
import { getString } from '@salesforce/ts-types';
import { SourceCommand } from '../../../../sourceCommand';
import { ConvertResultFormatter, ConvertCommandResult } from '../../../../formatters/convertResultFormatter';
import { ComponentSetBuilder } from '../../../../componentSetBuilder';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'md.convert');

export class Convert extends SourceCommand {
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessage('examples').split(os.EOL);
  public static readonly requiresProject = true;
  public static readonly flagsConfig: FlagsConfig = {
    rootdir: flags.directory({
      char: 'r',
      description: messages.getMessage('flags.rootdir'),
      longDescription: messages.getMessage('flagsLong.rootdir'),
      required: true,
    }),
    outputdir: flags.directory({
      char: 'd',
      description: messages.getMessage('flags.outputdir'),
      longDescription: messages.getMessage('flagsLong.outputdir'),
    }),
    manifest: flags.string({
      char: 'x',
      description: messages.getMessage('flags.manifest'),
      longDescription: messages.getMessage('flagsLong.manifest'),
    }),
    metadatapath: flags.array({
      char: 'p',
      description: messages.getMessage('flags.metadatapath'),
      longDescription: messages.getMessage('flagsLong.metadatapath'),
      exclusive: ['manifest', 'metadata'],
    }),
    metadata: flags.array({
      char: 'm',
      description: messages.getMessage('flags.metadata'),
      longDescription: messages.getMessage('flagsLong.metadata'),
      exclusive: ['manifest', 'metadatapath'],
    }),
  };

  private rootDir: string;
  private outputDir: string;

  protected convertResult: ConvertResult;

  public async run(): Promise<ConvertCommandResult> {
    await this.convert();
    this.resolveSuccess();
    return this.formatResult();
  }

  protected async convert(): Promise<void> {
    this.rootDir = this.resolveRootDir(this.getFlag<string>(this.flags.rootdir));
    this.outputDir = this.resolveOutputDir(this.getFlag<string>(this.flags.outputdir));
    const metadatapath = this.getFlag<string[]>(this.flags.metadatapath);

    this.componentSet = await ComponentSetBuilder.build({
      sourcepath: metadatapath || [this.rootDir],
      manifest: this.flags.manifest && {
        manifestPath: this.getFlag<string>('manifest'),
        directoryPaths: [this.rootDir],
      },
      metadata: this.flags.metadata && {
        metadataEntries: this.getFlag<string[]>('metadata'),
        directoryPaths: [this.rootDir],
      },
    });

    const converter = new MetadataConverter();
    this.convertResult = await converter.convert(this.componentSet, 'source', {
      type: 'directory',
      outputDirectory: this.outputDir,
      genUniqueDir: false,
    });
  }

  protected resolveSuccess(): void {
    if (!getString(this.convertResult, 'packagePath')) {
      this.setExitCode(1);
    }
  }

  protected formatResult(): ConvertCommandResult {
    const formatter = new ConvertResultFormatter(this.logger, this.ux, this.convertResult);

    if (!this.isJsonOutput()) {
      formatter.display();
    }
    return formatter.getJson();
  }

  private ensureFlagPath(flagName: string, path: string) {
    const stats = fs.statSync(path);

    if (stats) {
      if (!stats.isDirectory()) {
        throw SfdxError.create('@salesforce/plugin-source', 'md.convert', 'InvalidFlagPath', [flagName, path]);
      }
    } else {
      fs.mkdirSync(path, { recursive: true });
    }
  }

  private resolveRootDir(rootDir: string): string {
    const resolvedRootDir = resolve(rootDir.trim());
    this.ensureFlagPath('rootdir', resolvedRootDir);
    return resolvedRootDir;
  }

  private resolveOutputDir(outputDir?: string): string {
    let resolvedOutputDir: string;
    if (outputDir) {
      resolvedOutputDir = resolve(outputDir.trim());
    } else {
      resolvedOutputDir = this.project.getDefaultPackage().path;
    }
    this.ensureFlagPath('outputdir', resolvedOutputDir);

    return resolvedOutputDir;
  }
}
