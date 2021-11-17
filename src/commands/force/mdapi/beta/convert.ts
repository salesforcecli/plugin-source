/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as os from 'os';
import { resolve } from 'path';
import * as fs from 'fs';
import { flags, FlagsConfig } from '@salesforce/command';
import { Messages, SfdxError } from '@salesforce/core';
import { MetadataConverter, ConvertResult } from '@salesforce/source-deploy-retrieve';
import { Optional } from '@salesforce/ts-types';
import { SourceCommand } from '../../../../sourceCommand';
import { ConvertResultFormatter, ConvertCommandResult } from '../../../../formatters/mdapi/convertResultFormatter';
import { ComponentSetBuilder } from '../../../../componentSetBuilder';
import { FsError } from '../../../../types';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'md.convert');

interface EnsureFlagOptions {
  flagName: string;
  path: string;
  type: 'dir' | 'file' | 'any';
  throwOnENOENT?: boolean;
}

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
  private convertResult: ConvertResult;

  public async run(): Promise<ConvertCommandResult> {
    await this.convert();
    this.resolveSuccess();
    return this.formatResult();
  }

  protected async convert(): Promise<void> {
    this.rootDir = this.resolveRootDir(this.getFlag<string>('rootdir'));
    this.outputDir = this.resolveOutputDir(this.getFlag<string>('outputdir'));
    const metadatapath = this.resolveMetadataPaths(this.getFlag<string[]>('metadatapath'));
    const manifest = this.resolveManifest(this.getFlag<string>('manifest'));
    const metadata = this.getFlag<string[]>('metadata');

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
      this.ux.startSpinner(`Converting ${numOfComponents} metadata components`);

      const converter = new MetadataConverter();
      this.convertResult = await converter.convert(this.componentSet, 'source', {
        type: 'directory',
        outputDirectory: this.outputDir,
        genUniqueDir: false,
      });
      this.ux.stopSpinner();
    }
  }

  // No-op.  Any failure would throw an error.  If no error, it's successful.
  // The framework provides this behavior.
  /* eslint-disable-next-line @typescript-eslint/no-empty-function */
  protected resolveSuccess(): void {}

  protected formatResult(): ConvertCommandResult {
    const formatter = new ConvertResultFormatter(this.logger, this.ux, this.convertResult);

    if (!this.isJsonOutput()) {
      formatter.display();
    }
    return formatter.getJson();
  }

  private ensureFlagPath(options: EnsureFlagOptions): string {
    const { flagName, path, type, throwOnENOENT } = options;

    const trimmedPath = path?.trim();
    let resolvedPath: string;
    if (trimmedPath?.length) {
      resolvedPath = resolve(trimmedPath);
    }

    try {
      const stats = fs.statSync(resolvedPath);
      if (type !== 'any') {
        const isDir = stats.isDirectory();
        if ((type === 'dir' && !isDir) || (type === 'file' && isDir)) {
          throw SfdxError.create('@salesforce/plugin-source', 'md.convert', 'InvalidFlagPath', [flagName, path]);
        }
      }
    } catch (error: unknown) {
      const err = error as FsError;
      if (err.code !== 'ENOENT') {
        throw err;
      } else {
        if (throwOnENOENT) {
          throw SfdxError.create('@salesforce/plugin-source', 'md.convert', 'InvalidFlagPath', [flagName, path]);
        }
        fs.mkdirSync(resolvedPath, { recursive: true });
      }
    }
    return resolvedPath;
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
