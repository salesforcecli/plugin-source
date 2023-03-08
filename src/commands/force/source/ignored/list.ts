/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as path from 'path';
import * as fs from 'fs';

import { Messages, SfError } from '@salesforce/core';
import { ForceIgnore } from '@salesforce/source-deploy-retrieve';
import { Flags, SfCommand } from '@salesforce/sf-plugins-core';
import { FsError } from '../../../../types';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'ignored_list');

export type SourceIgnoredResults = {
  ignoredFiles: string[];
};

export class SourceIgnoredCommand extends SfCommand<SourceIgnoredResults> {
  public static readonly summary = messages.getMessage('description');
  public static readonly description = messages.getMessage('description');
  public static readonly requiresProject = true;
  public static readonly examples = [];
  public static readonly state = 'deprecated';
  public static readonly deprecationOptions = {
    to: 'project deploy preview --only-ignored',
    message: `The 'force:source:ignored:list' command will be deprecated, try the 'project deploy preview --only-ignored' command instead`,
  };
  public static readonly flags = {
    sourcepath: Flags.file({
      char: 'p',
      summary: messages.getMessage('flags.sourcepath'),
    }),
  };

  private forceIgnore: ForceIgnore;
  /**
   * Outputs all forceignored files from package directories of a project,
   * or based on a sourcepath param that points to a specific file or directory.
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  public async run(): Promise<SourceIgnoredResults> {
    const { flags } = await this.parse(SourceIgnoredCommand);
    try {
      this.forceIgnore = ForceIgnore.findAndCreate(this.project.getPath());
      const sourcepaths = flags.sourcepath
        ? [flags.sourcepath]
        : this.project.getUniquePackageDirectories().map((pDir) => pDir.path);

      const ignoredFiles = (await Promise.all(sourcepaths.map((sp) => this.statIgnored(sp.trim())))).flat();

      // Command output
      if (ignoredFiles.length) {
        this.log('Found the following ignored files:');
        ignoredFiles.forEach((filepath) => this.log(filepath));
      } else {
        this.log('No ignored files found in paths:');
        sourcepaths.forEach((sp) => this.log(sp));
      }

      return { ignoredFiles };
    } catch (err) {
      const error = err as FsError;
      if (error.code === 'ENOENT') {
        throw new SfError(messages.getMessage('invalidSourcePath', [flags.sourcepath]), 'invalidSourcePath');
      }
      throw SfError.wrap(error);
    }
  }

  // Stat the filepath.  Test if a file, recurse if a directory.
  private async statIgnored(filepath: string): Promise<string[]> {
    const stats = await fs.promises.stat(filepath);
    if (stats.isDirectory()) {
      return (await Promise.all(await this.findIgnored(filepath))).flat();
    } else {
      return this.isIgnored(filepath) ? [filepath] : [];
    }
  }

  // Recursively search a directory for source files to test.
  private async findIgnored(dir: string): Promise<Array<Promise<string[]>>> {
    this.debug(`Searching dir: ${dir}`);
    return (await fs.promises.readdir(dir)).map((filename) => this.statIgnored(path.join(dir, filename)));
  }

  // Test if a source file is denied, adding any ignored files to
  // the ignoredFiles array for output.
  private isIgnored(filepath: string): boolean {
    if (this.forceIgnore.denies(filepath)) {
      this.debug(`[DENIED]: ${filepath}`);
      return true;
    }
    this.debug(`[ACCEPTED]: ${filepath}`);
    return false;
  }
}
