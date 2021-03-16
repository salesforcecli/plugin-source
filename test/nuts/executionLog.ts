/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Context, SourceMember } from './types';

export class ExecutionLog {
  public log: ExecutionLog.Log = new Map<string, ExecutionLog.Details[]>();

  public constructor(private context: Context) {}

  public async add(cmd: string): Promise<void> {
    const baseCmd = cmd.split(' ')[0];
    const existingEntries = this.log.get(baseCmd) || [];
    const sourceMembers =
      baseCmd.includes('force:source:deploy') || baseCmd.includes('force:source:push')
        ? await this.querySourceMembers()
        : [];
    const newEntry = {
      timestamp: new Date(),
      fullCommand: cmd,
      sourceMembers,
    };

    this.log.set(baseCmd, [...existingEntries, newEntry]);
  }

  public getLatestTimestamp(cmd: string): Date {
    return this.log.get(cmd).reverse()[0].timestamp;
  }

  public getLatest(cmd: string): ExecutionLog.Details {
    return this.log.get(cmd).reverse()[0];
  }

  private async querySourceMembers(): Promise<SourceMember[]> {
    const query = 'SELECT Id,MemberName,MemberType,RevisionCounter FROM SourceMember';
    const result = await this.context.connection.tooling.query<SourceMember>(query, {
      autoFetch: true,
      maxFetch: 50000,
    });
    return result.records;
  }
}

export namespace ExecutionLog {
  export type Log = Map<string, ExecutionLog.Details[]>;

  export type Details = {
    timestamp: Date;
    fullCommand: string;
    sourceMembers: SourceMember[];
  };
}
