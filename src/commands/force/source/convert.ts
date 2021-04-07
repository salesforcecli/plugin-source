/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as os from 'os';
import { resolve } from 'path';
import { flags, FlagsConfig } from '@salesforce/command';
import { Messages } from '@salesforce/core';
import { MetadataConverter } from '@salesforce/source-deploy-retrieve';
import { asArray, asString } from '@salesforce/ts-types';
import { SourceCommand } from '../../../sourceCommand';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'convert');

type ConvertResult = {
  location: string;
};

export class Convert extends SourceCommand {
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessage('examples').split(os.EOL);
  public static readonly requiresProject = true;
  public static readonly requiresUsername = true;
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

  public async run(): Promise<ConvertResult> {
    const paths: string[] = [];

    if (this.flags.sourcepath) {
      paths.push(...this.flags.sourcepath);
    }

    // rootdir behaves exclusively to sourcepath, metadata, and manifest... to maintain backwards compatibility
    // we will check here, instead of adding the exclusive option to the flag definition so we don't break scripts
    if (this.flags.rootdir && !this.flags.sourcepath && !this.flags.metadata && !this.flags.manifest) {
      // only rootdir option passed
      paths.push(this.flags.rootdir);
    }

    // no options passed, convert the default package (usually force-app)
    if (!this.flags.sourcepath && !this.flags.metadata && !this.flags.manifest && !this.flags.rootdir) {
      paths.push(this.project.getDefaultPackage().path);
    }

    const cs = await this.createComponentSet({
      sourcepath: paths,
      manifest: asString(this.flags.manifest),
      metadata: asArray<string>(this.flags.metadata),
    });

    const converter = new MetadataConverter();
    const res = await converter.convert(cs.getSourceComponents().toArray(), 'metadata', {
      type: 'directory',
      outputDirectory: asString(this.flags.outputdir),
      packageName: asString(this.flags.packagename),
    });

    this.ux.log(messages.getMessage('success', [res.packagePath]));

    return {
      location: resolve(res.packagePath),
    };
  }
}
