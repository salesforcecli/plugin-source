/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { SfdxCommand } from '@salesforce/command';
import { Lifecycle } from '@salesforce/core';
import { get, getBoolean, JsonMap } from '@salesforce/ts-types';
import cli from 'cli-ux';
import { TelemetryGlobal } from '@salesforce/plugin-telemetry/lib/telemetryGlobal';
import { ComponentSet } from '@salesforce/source-deploy-retrieve';

export type ProgressBar = {
  start: (num: number) => void;
  update: (num: number) => void;
  updateTotal: (num: number) => void;
  setTotal: (num: number) => void;
  stop: () => void;
};
declare const global: TelemetryGlobal;

export abstract class SourceCommand extends SfdxCommand {
  public static DEFAULT_SRC_WAIT_MINUTES = 33;
  public progressBar?: ProgressBar;
  public lifecycle = Lifecycle.getInstance();
  public telemetryData: JsonMap;

  public exit(code?: number): never {
    if (global.cliTelemetry && global.cliTelemetry.record && this.telemetryData) {
      global.cliTelemetry.record(this.telemetryData);
    }
    return super.exit(code);
  }

  public setTelemetryData(operation: string, cs: ComponentSet): void {
    let components = cs.toArray();
    const totalNumberOfPackages: number = this.project.getUniquePackageDirectories().length;
    const isTruncated: boolean = components.length >= 8000;
    if (isTruncated) {
      components = components.slice(0, 7975);
    }
    this.telemetryData = {
      eventName: 'SOURCE_COMMAND',
      operation,
      type: 'EVENT',
      plugin: 'plugin-source',
      totalNumberOfPackages,
      components: components.join(','),
      isTruncated,
    };
  }

  public isJsonOutput(): boolean {
    return getBoolean(this.flags, 'json', false);
  }

  public getFlag<T>(flagName: string, defaultVal?: unknown): T {
    return get(this.flags, flagName, defaultVal) as T;
  }

  public initProgressBar(): void {
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
