/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { SfdxCommand } from '@salesforce/command';
import { Lifecycle, SfdxError } from '@salesforce/core';
import { ComponentSet, RequestStatus } from '@salesforce/source-deploy-retrieve';
import { get, getBoolean, getString, Optional } from '@salesforce/ts-types';
import cli from 'cli-ux';

export type ProgressBar = {
  start: (num: number) => void;
  update: (num: number) => void;
  updateTotal: (num: number) => void;
  setTotal: (num: number) => void;
  stop: () => void;
};

export abstract class SourceCommand extends SfdxCommand {
  public static readonly DEFAULT_SRC_WAIT_MINUTES = 33;
  public static readonly StatusCodeMap = new Map<RequestStatus, number>([
    [RequestStatus.Succeeded, 0],
    [RequestStatus.Canceled, 0],
    [RequestStatus.Failed, 1],
    [RequestStatus.SucceededPartial, 68],
    [RequestStatus.InProgress, 69],
    [RequestStatus.Pending, 69],
    [RequestStatus.Canceling, 69],
  ]);
  protected xorFlags: string[] = [];
  protected progressBar?: ProgressBar;
  protected lifecycle = Lifecycle.getInstance();

  protected componentSet?: ComponentSet;

  protected isJsonOutput(): boolean {
    return getBoolean(this.flags, 'json', false);
  }

  protected validateFlags(): void {
    // verify that the user defined one of the flag names specified in requiredFlags property
    if (!Object.keys(this.flags).some((flag) => this.xorFlags.includes(flag))) {
      throw SfdxError.create('@salesforce/plugin-source', 'deploy', 'MissingRequiredParam', [this.xorFlags.join(', ')]);
    }
  }

  protected getFlag<T>(flagName: string, defaultVal?: unknown): T {
    return get(this.flags, flagName, defaultVal) as T;
  }

  protected initProgressBar(): void {
    this.logger.debug('initializing progress bar');
    this.progressBar = cli.progress({
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
  protected setExitCode(code: number): void {
    process.exitCode = code;
  }

  protected getPackageDirs(): string[] {
    return this.project.getUniquePackageDirectories().map((pDir) => pDir.fullPath);
  }

  protected async getSourceApiVersion(): Promise<Optional<string>> {
    const projectConfig = await this.project.resolveProjectConfig();
    return getString(projectConfig, 'sourceApiVersion');
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
