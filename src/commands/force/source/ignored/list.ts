/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as path from 'path';
import { flags, FlagsConfig, SfdxCommand } from '@salesforce/command';
import { fs as fsCore, Messages, SfdxError } from '@salesforce/core';
import { ForceIgnore } from '@salesforce/source-deploy-retrieve';
import { FsError } from '../../../../types';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'ignored_list');

export type SourceIgnoredResults = {
  ignoredFiles: string[];
};

export class SourceIgnoredCommand extends SfdxCommand {
  public static readonly description = messages.getMessage('description');
  public static readonly requiresProject = true;

  public static readonly flagsConfig: FlagsConfig = {
    sourcepath: flags.filepath({
      char: 'p',
      description: messages.getMessage('flags.sourcepath'),
    }),
  };

  private forceIgnore: ForceIgnore;
  /**
   * Outputs all forceignored files from package directories of a project,
   * or based on a sourcepath param that points to a specific file or directory.
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  public async run(): Promise<SourceIgnoredResults> {
    try {
      this.forceIgnore = ForceIgnore.findAndCreate(this.project.getPath());
      const sourcepaths = this.flags.sourcepath
        ? [this.flags.sourcepath as string]
        : this.project.getUniquePackageDirectories().map((pDir) => pDir.path);

      const ignoredFiles = (await Promise.all(sourcepaths.map((sp) => this.statIgnored(sp.trim())))).flat();

      // Command output
      if (ignoredFiles.length) {
        this.ux.log('Found the following ignored files:');
        ignoredFiles.forEach((filepath) => this.ux.log(filepath));
      } else {
        this.ux.log('No ignored files found in paths:');
        sourcepaths.forEach((sp) => this.ux.log(sp));
      }

      return { ignoredFiles };
    } catch (err) {
      const error = err as FsError;
      if (error.code === 'ENOENT') {
        throw SfdxError.create('@salesforce/plugin-source', 'ignored_list', 'invalidSourcePath', [
          this.flags.sourcepath as string,
        ]);
      }
      throw SfdxError.wrap(error);
    }
  }

  // Stat the filepath.  Test if a file, recurse if a directory.
  private async statIgnored(filepath: string): Promise<string[]> {
    const stats = await fsCore.stat(filepath);
    if (stats.isDirectory()) {
      return (await Promise.all(await this.findIgnored(filepath))).flat();
    } else {
      return this.isIgnored(filepath) ? [filepath] : [];
    }
  }

  // Recursively search a directory for source files to test.
  private async findIgnored(dir: string): Promise<Array<Promise<string[]>>> {
    this.logger.debug(`Searching dir: ${dir}`);
    return (await fsCore.readdir(dir)).map((filename) => this.statIgnored(path.join(dir, filename)));
  }

  // Test if a source file is denied, adding any ignored files to
  // the ignoredFiles array for output.
  private isIgnored(filepath: string): boolean {
    if (this.forceIgnore.denies(filepath)) {
      this.logger.debug(`[DENIED]: ${filepath}`);
      return true;
    }
    this.logger.debug(`[ACCEPTED]: ${filepath}`);
    return false;
  }
}
