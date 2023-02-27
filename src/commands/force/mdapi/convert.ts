/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Messages } from '@salesforce/core';
import { ComponentSetBuilder, ConvertResult, MetadataConverter } from '@salesforce/source-deploy-retrieve';
import { Optional } from '@salesforce/ts-types';
import {
  arrayWithDeprecation,
  Flags,
  loglevel,
  orgApiVersionFlagWithDeprecations,
  Ux,
} from '@salesforce/sf-plugins-core';
import { Interfaces } from '@oclif/core';
import { SourceCommand } from '../../../sourceCommand';
import { ConvertCommandResult, ConvertResultFormatter } from '../../../formatters/mdapi/convertResultFormatter';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'md.convert');

export class Convert extends SourceCommand {
  public static aliases = ['force:mdapi:beta:convert'];
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly requiresProject = true;
  public static readonly flags = {
    'api-version': orgApiVersionFlagWithDeprecations,
    loglevel,
    rootdir: Flags.directory({
      char: 'r',
      description: messages.getMessage('flags.rootdir'),
      summary: messages.getMessage('flagsLong.rootdir'),
      required: true,
    }),
    outputdir: Flags.directory({
      char: 'd',
      description: messages.getMessage('flags.outputdir'),
      summary: messages.getMessage('flagsLong.outputdir'),
    }),
    manifest: Flags.string({
      char: 'x',
      description: messages.getMessage('flags.manifest'),
      summary: messages.getMessage('flagsLong.manifest'),
    }),
    metadatapath: arrayWithDeprecation({
      char: 'p',
      description: messages.getMessage('flags.metadatapath'),
      summary: messages.getMessage('flagsLong.metadatapath'),
      exclusive: ['manifest', 'metadata'],
    }),
    metadata: arrayWithDeprecation({
      char: 'm',
      description: messages.getMessage('flags.metadata'),
      summary: messages.getMessage('flagsLong.metadata'),
      exclusive: ['manifest', 'metadatapath'],
    }),
  };

  private rootDir: string;
  private outputDir: string;
  private convertResult: ConvertResult;
  private flags: Interfaces.InferredFlags<typeof Convert.flags>;

  public async run(): Promise<ConvertCommandResult> {
    this.flags = (await this.parse(Convert)).flags;
    await this.convert();
    this.resolveSuccess();
    return this.formatResult();
  }

  protected async convert(): Promise<void> {
    this.rootDir = this.resolveRootDir(this.flags.rootdir);
    this.outputDir = this.resolveOutputDir(this.flags.outputdir);
    const metadatapath = this.resolveMetadataPaths(this.flags.metadatapath);
    const manifest = this.resolveManifest(this.flags.manifest);
    const metadata = this.flags.metadata;

    let paths: string[];
    if (metadatapath) {
      paths = metadatapath;
    } else if (!manifest && !metadata) {
      paths = [this.rootDir];
    }

    this.componentSet = await ComponentSetBuilder.build({
      sourcepath: paths,
      manifest: manifest && {
        manifestPath: manifest,
        directoryPaths: [this.rootDir],
      },
      metadata: metadata && {
        metadataEntries: metadata,
        directoryPaths: [this.rootDir],
      },
    });

    const numOfComponents = this.componentSet.getSourceComponents().toArray().length;
    if (numOfComponents > 0) {
      this.spinner.start(`Converting ${numOfComponents} metadata components`);

      const converter = new MetadataConverter();
      this.convertResult = await converter.convert(this.componentSet, 'source', {
        type: 'directory',
        outputDirectory: this.outputDir,
        genUniqueDir: false,
      });
      this.spinner.stop();
    }
  }

  // No-op.  Any failure would throw an error.  If no error, it's successful.
  // The framework provides this behavior.
  /* eslint-disable-next-line @typescript-eslint/no-empty-function, class-methods-use-this */
  protected resolveSuccess(): void {}

  protected formatResult(): ConvertCommandResult {
    const formatter = new ConvertResultFormatter(new Ux({ jsonEnabled: this.jsonEnabled() }), this.convertResult);

    if (!this.jsonEnabled()) {
      formatter.display();
    }
    return formatter.getJson();
  }

  private resolveRootDir(rootDir: string): string {
    return this.ensureFlagPath({
      flagName: 'rootdir',
      path: rootDir,
      type: 'dir',
      throwOnENOENT: true,
    });
  }

  private resolveOutputDir(outputDir?: string): string {
    return this.ensureFlagPath({
      flagName: 'outputdir',
      path: outputDir || this.project.getDefaultPackage().path,
      type: 'dir',
    });
  }

  private resolveManifest(manifestPath?: string): Optional<string> {
    if (manifestPath?.length) {
      return this.ensureFlagPath({
        flagName: 'manifest',
        path: manifestPath,
        type: 'file',
        throwOnENOENT: true,
      });
    }
  }

  private resolveMetadataPaths(metadataPaths: string[]): Optional<string[]> {
    const resolvedMetadataPaths: string[] = [];

    if (metadataPaths?.length) {
      metadataPaths.forEach((mdPath) => {
        if (mdPath?.length) {
          resolvedMetadataPaths.push(
            this.ensureFlagPath({
              flagName: 'metadatapath',
              path: mdPath,
              type: 'any',
              throwOnENOENT: true,
            })
          );
        }
      });
    }
    return resolvedMetadataPaths.length ? resolvedMetadataPaths : undefined;
  }
}
