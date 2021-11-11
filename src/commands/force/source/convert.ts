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
import { Messages } from '@salesforce/core';
import { MetadataConverter, ConvertResult } from '@salesforce/source-deploy-retrieve';
import { getString } from '@salesforce/ts-types';
import { SourceCommand } from '../../../sourceCommand';
import { ConvertResultFormatter, ConvertCommandResult } from '../../../formatters/convertResultFormatter';
import { ComponentSetBuilder } from '../../../componentSetBuilder';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'convert');

export class Convert extends SourceCommand {
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessage('examples').split(os.EOL);
  public static readonly requiresProject = true;
  public static readonly flagsConfig: FlagsConfig = {
    rootdir: flags.directory({
      char: 'r',
      description: messages.getMessage('flags.rootdir'),
    }),
    outputdir: flags.directory({
      default: `metadataPackage_${Date.now()}`,
      char: 'd',
      description: messages.getMessage('flags.outputdir'),
    }),
    packagename: flags.string({
      char: 'n',
      description: messages.getMessage('flags.packagename'),
    }),
    manifest: flags.string({
      char: 'x',
      description: messages.getMessage('flags.manifest'),
      longDescription: messages.getMessage('flagsLong.manifest'),
    }),
    sourcepath: flags.array({
      char: 'p',
      description: messages.getMessage('flags.sourcepath'),
      longDescription: messages.getMessage('flagsLong.sourcepath'),
      exclusive: ['manifest', 'metadata'],
    }),
    metadata: flags.array({
      char: 'm',
      description: messages.getMessage('flags.metadata'),
      exclusive: ['manifest', 'sourcepath'],
    }),
  };

  protected convertResult: ConvertResult;

  public async run(): Promise<ConvertCommandResult> {
    await this.convert();
    this.resolveSuccess();
    return this.formatResult();
  }

  protected async convert(): Promise<void> {
    const paths: string[] = [];

    const { sourcepath, metadata, manifest, rootdir } = this.flags;

    if (sourcepath) {
      paths.push(...(sourcepath as string[]));
    }

    // rootdir behaves exclusively to sourcepath, metadata, and manifest... to maintain backwards compatibility
    // we will check here, instead of adding the exclusive option to the flag definition so we don't break scripts
    if (rootdir && !sourcepath && !metadata && !manifest && typeof rootdir === 'string') {
      // only rootdir option passed
      paths.push(rootdir);
    }

    // no options passed, convert the default package (usually force-app)
    if (!sourcepath && !metadata && !manifest && !rootdir) {
      paths.push(this.project.getDefaultPackage().path);
    }

    this.componentSet = await ComponentSetBuilder.build({
      sourceapiversion: await this.getSourceApiVersion(),
      sourcepath: paths,
      manifest: manifest && {
        manifestPath: this.getFlag<string>('manifest'),
        directoryPaths: this.getPackageDirs(),
      },
      metadata: metadata && {
        metadataEntries: this.getFlag<string[]>('metadata'),
        directoryPaths: this.getPackageDirs(),
      },
    });

    const packageName = this.getFlag<string>('packagename');
    const outputDirectory = resolve(this.getFlag<string>('outputdir'));
    const converter = new MetadataConverter();
    this.convertResult = await converter.convert(this.componentSet, 'metadata', {
      type: 'directory',
      outputDirectory,
      packageName,
      genUniqueDir: false,
    });

    if (packageName) {
      // SDR will build an output path like /output/directory/packageName/package.xml
      // this was breaking from toolbelt, so to revert it we copy the directory up a level and delete the original
      this.copyDir(this.convertResult.packagePath, outputDirectory);
      try {
        fs.rmSync(this.convertResult.packagePath, { recursive: true });
      } catch (e) {
        // rmdirSync is being deprecated and emits a warning
        // but rmSync is introduced in node 14 so fall back to rmdirSync
        fs.rmdirSync(this.convertResult.packagePath, { recursive: true });
      }

      this.convertResult.packagePath = outputDirectory;
    }
  }

  // TODO: move into fs in sfdx-core
  protected copyDir(src: string, dest: string): void {
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });

    entries.map((entry) => {
      const srcPath = join(src, entry.name);
      const destPath = join(dest, entry.name);

      return entry.isDirectory() ? this.copyDir(srcPath, destPath) : fs.copyFileSync(srcPath, destPath);
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
}
