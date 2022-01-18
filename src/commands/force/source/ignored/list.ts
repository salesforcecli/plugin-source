/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { flags, FlagsConfig, SfdxCommand } from '@salesforce/command';
import { Messages } from '@salesforce/core';
import { ComponentSet } from '@salesforce/source-deploy-retrieve';

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

  /**
   * Outputs all forceignored files from package directories of a project,
   * or based on a sourcepath param that points to a specific file or directory.
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  public async run(): Promise<SourceIgnoredResults> {
    const sourcepaths = this.flags.sourcepath
      ? [this.flags.sourcepath as string]
      : this.project.getUniquePackageDirectories().map((pDir) => pDir.path);
    const compSet = ComponentSet.fromSource(sourcepaths);
    const ignoredFiles = Array.from(compSet.forceIgnoredPaths);
    // Command output
    if (ignoredFiles.length) {
      this.ux.log('Found the following ignored files:');
      ignoredFiles.forEach((filepath) => this.ux.log(filepath));
    } else {
      this.ux.log('No ignored files found in paths:');
      sourcepaths.forEach((sp) => this.ux.log(sp));
    }

    return { ignoredFiles };
  }
}
