/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { JsonMap } from '@salesforce/ts-types';

/**
 * NOTICE: These types are only sufficient for running the NUTs. They are likely incomplete and in some cases incorrect.
 * As we add commands to plugin-source, we should finalize the respective types and move them to the appropriate file location.
 * This file should eventually be deleted.
 */

export type SourceState = 'Local Add' | 'Local Changed' | 'Remote Add' | 'Remote Changed' | 'Local Deleted';

export type SourceInfo = {
  state: string;
  fullName: string;
  type: string;
  filePath: string;
};

export type RetrieveResult = {
  inboundFiles: SourceInfo[];
  packages?: Array<{
    name: string;
    path: string;
  }>;
};

export type SimpleDeployResult = {
  deployedSource: SourceInfo[];
};

export type BaseDeployResult = {
  checkOnly: boolean;
  createdBy: string;
  createdByName: string;
  createdDate: string;
  done: boolean;
  id: string;
  ignoreWarnings: boolean;
  lastModifiedDate: string;
  numberComponentErrors: number;
  numberComponentsDeployed: number;
  numberComponentsTotal: number;
  numberTestErrors: number;
  numberTestsCompleted: number;
  numberTestsTotal: number;
  rollbackOnError: boolean;
  runTestsEnabled: boolean;
  status: 'Succeeded' | 'Pending' | 'Canceled';
  success: boolean;
  details: {
    componentSuccesses: ComponentSuccess[];
    runTestResult: RunTestResult;
  };
};

export type ComponentSuccess = {
  changed: string;
  componentType: string;
  created: string;
  createdDate: string;
  deleted: string;
  fileName: string;
  fullName: string;
  id?: string;
  success: string;
};

type TestSuccess = {
  id: string;
  methodName: string;
  namespace: JsonMap;
  name: string;
  time: string;
};

type CodeCoverage = {
  id: string;
  name: string;
  namespace: JsonMap;
  numLocations: string;
  numLocationsNotCovered: string;
  type: string;
};

export type RunTestResult = {
  numFailures: string;
  numTestsRun: string;
  totalTime: string;
  successes?: TestSuccess[];
  codeCoverage?: CodeCoverage[];
};

export type ComplexDeployResult = BaseDeployResult & {
  outboundFiles: string[];
  deploys: ComplexDeployResult[];
  completedDate: string;
  startDate: string;
};

export type DeployReportResult = BaseDeployResult & {
  completedDate: string;
  startDate: string;
};

export type DeployCancelResult = BaseDeployResult & {
  canceledBy: string;
  canceledByName: string;
  details: {
    runTestResult: RunTestResult;
  };
};

export type PushResult = {
  pushedSource: SourceInfo[];
};

export type PullResult = {
  pulledSource: SourceInfo[];
};

export type StatusResult = SourceInfo[];

export type ConvertResult = {
  location: string;
};

export type Result<T> = JsonMap & {
  status: number;
  result: T;
};
