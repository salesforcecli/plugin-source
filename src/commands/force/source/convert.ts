/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as os from 'os';
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
      default: './',
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
    }),
    sourcepath: flags.array({
      char: 'p',
      description: messages.getMessage('flags.sourcepath'),
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
      paths.push(...sourcepath);
    }

    // rootdir behaves exclusively to sourcepath, metadata, and manifest... to maintain backwards compatibility
    // we will check here, instead of adding the exclusive option to the flag definition so we don't break scripts
    if (rootdir && !sourcepath && !metadata && !manifest) {
      // only rootdir option passed
      paths.push(rootdir);
    }

    // no options passed, convert the default package (usually force-app)
    if (!sourcepath && !metadata && !manifest && !rootdir) {
      paths.push(this.project.getDefaultPackage().path);
    }

    const cs = await ComponentSetBuilder.build({
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

    const converter = new MetadataConverter();
    this.convertResult = await converter.convert(cs.getSourceComponents().toArray(), 'metadata', {
      type: 'directory',
      outputDirectory: this.getFlag<string>('outputdir'),
      packageName: this.getFlag<string>('packagename'),
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
}
