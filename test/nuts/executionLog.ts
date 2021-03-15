/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

export class ExecutionLog {
  public log: ExecutionLog.Log = new Map<string, ExecutionLog.Details[]>();

  public add(cmd: string): void {
    const baseCmd = cmd.split(' ')[0];
    const existingEntries = this.log.get(baseCmd) || [];
    const newEntry = {
      timestamp: new Date(),
      fullCommand: cmd,
    };
    this.log.set(baseCmd, [...existingEntries, newEntry]);
  }

  public getLatestTimestamp(cmd: string): Date {
    return this.log.get(cmd).reverse()[0].timestamp;
  }
}

export namespace ExecutionLog {
  export type Log = Map<string, ExecutionLog.Details[]>;

  export type Details = {
    timestamp: Date;
    fullCommand: string;
  };
}
