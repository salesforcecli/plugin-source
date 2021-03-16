/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Connection } from '@salesforce/core';
import { JsonMap } from '@salesforce/ts-types';

export type Result<T = JsonMap> = JsonMap & {
  status: number;
  result: T;
};

export type Context = {
  projectDir: string;
  connection: Connection;
  nut: string;
};

export type ApexTestResult = {
  TestTimestamp: string;
  ApexClassId: string;
};

export type ApexClass = {
  Id: string;
  Name: string;
};

export type SourceMember = {
  Id: string;
  MemberName: string;
  MemberType: string;
  RevisionCounter: number;
};

/**
 * NOTICE: The following types are only sufficient for running the NUTs. They are likely incomplete and in some cases incorrect.
 * As we add commands to plugin-source, we should finalize the respective types and move them to the appropriate file location.
 */

export type SourceState = 'Local Add' | 'Local Changed' | 'Remote Add' | 'Remote Changed' | 'Local Deleted';

export type SourceInfo = {
  state: string;
  fullName: string;
  type: string;
  filePath: string;
};

export type StatusResult = SourceInfo[];
