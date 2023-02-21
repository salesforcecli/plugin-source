/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { join, resolve } from 'path';
import * as fs from 'fs';

import { Messages } from '@salesforce/core';
import { ComponentSetBuilder, ConvertResult, MetadataConverter } from '@salesforce/source-deploy-retrieve';
import { getString } from '@salesforce/ts-types';
import {
  Flags,
  loglevel,
  orgApiVersionFlagWithDeprecations,
  requiredOrgFlagWithDeprecations,
  Ux,
} from '@salesforce/sf-plugins-core';
import { Interfaces } from '@oclif/core';
import { SourceCommand } from '../../../sourceCommand';
import { ConvertCommandResult, ConvertResultFormatter } from '../../../formatters/convertResultFormatter';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'convert');

export class Convert extends SourceCommand {
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly requiresProject = true;
  public static readonly flags = {
    'api-version': orgApiVersionFlagWithDeprecations,
    loglevel,
    'target-org': requiredOrgFlagWithDeprecations,
    rootdir: Flags.directory({
      char: 'r',
      description: messages.getMessage('flags.rootdir'),
    }),
    outputdir: Flags.directory({
      default: `metadataPackage_${Date.now()}`,
      char: 'd',
      description: messages.getMessage('flags.outputdir'),
    }),
    packagename: Flags.string({
      char: 'n',
      description: messages.getMessage('flags.packagename'),
    }),
    manifest: Flags.string({
      char: 'x',
      description: messages.getMessage('flags.manifest'),
      summary: messages.getMessage('flagsLong.manifest'),
    }),
    sourcepath: Flags.string({
      multiple: true,
      char: 'p',
      description: messages.getMessage('flags.sourcepath'),
      summary: messages.getMessage('flagsLong.sourcepath'),
      exclusive: ['manifest', 'metadata'],
    }),
    metadata: Flags.string({
      multiple: true,
      char: 'm',
      description: messages.getMessage('flags.metadata'),
      exclusive: ['manifest', 'sourcepath'],
    }),
  };

  protected convertResult: ConvertResult;
  private flags: Interfaces.InferredFlags<typeof Convert.flags>;

  public async run(): Promise<ConvertCommandResult> {
    this.flags = (await this.parse(Convert)).flags;
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
        manifestPath: this.flags.manifest,
        directoryPaths: this.getPackageDirs(),
      },
      metadata: metadata && {
        metadataEntries: this.flags.metadata,
        directoryPaths: this.getPackageDirs(),
      },
    });

    const packageName = this.flags.packagename;
    const outputDirectory = resolve(this.flags.outputdir);
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
      fs.rmSync(this.convertResult.packagePath, { recursive: true });
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
    const formatter = new ConvertResultFormatter(new Ux({ jsonEnabled: this.jsonEnabled() }), this.convertResult);

    if (!this.jsonEnabled()) {
      formatter.display();
    }
    return formatter.getJson();
  }
}
