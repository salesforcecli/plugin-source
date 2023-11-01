/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { dirname, resolve, extname } from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Messages, SfError } from '@salesforce/core';
import { ComponentSet } from '@salesforce/source-deploy-retrieve';
import { getString, Optional } from '@salesforce/ts-types';
import { ux } from '@oclif/core';
import { SfCommand } from '@salesforce/sf-plugins-core';
import { EnsureFsFlagOptions, FsError, ProgressBar } from './types.js';

Messages.importMessagesDirectory(dirname(fileURLToPath(import.meta.url)));
const messages = Messages.loadMessages('@salesforce/plugin-source', 'flags.validation');

export abstract class SourceCommand extends SfCommand<unknown> {
  public static readonly DEFAULT_WAIT_MINUTES = 33;

  protected progressBar?: ProgressBar;
  protected componentSet?: ComponentSet;

  protected initProgressBar(): void {
    this.debug('initializing progress bar');
    this.progressBar = ux.progress({
      format: 'SOURCE PROGRESS | {bar} | {value}/{total} Components',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      linewrap: true,
    }) as ProgressBar;
  }

  /**
   * Sets an exit code on the process that marks success or failure
   * after successful command execution.
   *
   * @param code The exit code to set on the process.
   */
  // eslint-disable-next-line class-methods-use-this
  protected setExitCode(code: number): void {
    process.exitCode = code;
  }

  protected getPackageDirs(): string[] {
    return this.project.getUniquePackageDirectories().map((pDir) => pDir.fullPath);
  }

  protected async getSourceApiVersion(): Promise<Optional<string>> {
    const projectConfig = await this.project.resolveProjectConfig();
    return getString(projectConfig, 'sourceApiVersion') as string;
  }

  /**
   * Ensures command flags that are file system paths are set properly before
   * continuing command execution.  Can also create directories that don't yet
   * exist in the path.
   *
   * @param options defines the path to resolve and the expectations
   * @returns the resolved flag path
   */
  // eslint-disable-next-line class-methods-use-this
  protected ensureFlagPath(options: EnsureFsFlagOptions): string {
    const { flagName, path, type, throwOnENOENT } = options;

    const trimmedPath = path?.trim();
    let resolvedPath = '';
    if (trimmedPath?.length) {
      resolvedPath = resolve(trimmedPath);
    }

    try {
      const stats = fs.statSync(resolvedPath);
      if (type !== 'any') {
        const isDir = stats.isDirectory();
        if (type === 'dir' && !isDir) {
          const msg = messages.getMessage('expectedDirectory');
          throw new SfError(messages.getMessage('InvalidFlagPath', [flagName, path, msg]), 'InvalidFlagPath');
        } else if (type === 'file' && isDir) {
          const msg = messages.getMessage('expectedFile');
          throw new SfError(messages.getMessage('InvalidFlagPath', [flagName, path, msg]), 'InvalidFlagPath');
        }
      }
    } catch (error: unknown) {
      const err = error as FsError;
      if (err.code !== 'ENOENT') {
        throw err;
      } else {
        if (throwOnENOENT) {
          const enoent = messages.getMessage('notFound');
          throw new SfError(messages.getMessage('InvalidFlagPath', [flagName, path, enoent]), 'InvalidFlagPath');
        }
        const dir = type === 'dir' ? resolvedPath : dirname(resolvedPath);
        fs.mkdirSync(dir, { recursive: true });
      }
    }
    return resolvedPath;
  }

  /**
   * Inspects the command response to determine success.
   *
   * NOTE: This is not about unexpected command errors such as timeouts,
   * or command flag parsing errors, but a successful
   * command execution's results. E.g., the deploy command
   * ran successfully but had ApexClass compilation errors,
   * so the deployment was unsuccessful.
   */
  protected abstract resolveSuccess(): void;

  /**
   * Formats the JSON returned by the command and optionally
   * (if --json is not set) displays output to the console.
   */
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  protected abstract formatResult(): any;
}

export const resolveZipFileName = (zipFileName?: string): string => {
  // If no file extension was provided append, '.zip'
  if (zipFileName && !extname(zipFileName)) {
    zipFileName += '.zip';
  }
  return zipFileName ?? 'unpackaged.zip';
};
