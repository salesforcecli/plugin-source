/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { DeployResult } from '@salesforce/source-deploy-retrieve';
import {
  DeployMessage,
  MetadataApiDeployStatus,
  RequestStatus,
} from '@salesforce/source-deploy-retrieve/lib/src/client/types';
import { cloneJson } from '@salesforce/kit';
import { toArray } from '../../../src/formatters/resultFormatter';

const baseDeployResponse = {
  checkOnly: false,
  completedDate: '2021-04-09T20:23:05.000Z',
  createdBy: '0051h000006BHOq',
  createdByName: 'User User',
  createdDate: '2021-04-09T20:22:58.000Z',
  details: {
    componentSuccesses: [
      {
        changed: 'true',
        componentType: '',
        created: 'false',
        createdDate: '2021-04-27T22:18:07.000Z',
        deleted: 'false',
        fileName: 'package.xml',
        fullName: 'package.xml',
        success: 'true',
      },
      {
        changed: 'false',
        componentType: 'ApexClass',
        created: 'false',
        createdDate: '2021-04-27T22:18:07.000Z',
        deleted: 'false',
        fileName: 'classes/ProductController.cls',
        fullName: 'ProductController',
        id: '01p2100000A6XiqAAF',
        success: 'true',
      },
    ],
    runTestResult: {
      numFailures: '0',
      numTestsRun: '0',
      totalTime: '0.0',
    },
  },
  done: true,
  id: '0Af21000011PxhqCAC',
  ignoreWarnings: false,
  lastModifiedDate: '2021-04-09T20:23:05.000Z',
  numberComponentErrors: 0,
  numberComponentsDeployed: 1,
  numberComponentsTotal: 1,
  numberTestErrors: 0,
  numberTestsCompleted: 0,
  numberTestsTotal: 0,
  rollbackOnError: true,
  runTestsEnabled: false,
  startDate: '2021-04-09T20:22:58.000Z',
  status: 'Succeeded',
  success: true,
};

export type DeployResponseType =
  | 'successSync'
  | 'successAsync'
  | 'successRecentValidation'
  | 'canceled'
  | 'inProgress'
  | 'failed'
  | 'failedTest'
  | 'passedTest'
  | 'passedAndFailedTest';

export const getDeployResponse = (
  type: DeployResponseType,
  overrides?: Partial<MetadataApiDeployStatus>
): MetadataApiDeployStatus => {
  // stringify --> parse to get a clone that doesn't affedt the base deploy response
  const response = JSON.parse(JSON.stringify({ ...baseDeployResponse, ...overrides })) as MetadataApiDeployStatus;

  if (type === 'canceled') {
    response.canceledBy = '0051h000006BHOq';
    response.canceledByName = 'Canceling User';
    response.status = RequestStatus.Canceled;
  }

  if (type === 'failed') {
    response.status = RequestStatus.Failed;
    response.success = false;
    response.details.componentFailures = cloneJson(baseDeployResponse.details.componentSuccesses[1]) as DeployMessage;
    response.details.componentSuccesses = cloneJson(baseDeployResponse.details.componentSuccesses[0]) as DeployMessage;
    response.details.componentFailures.success = 'false';
    delete response.details.componentFailures.id;
    response.details.componentFailures.problemType = 'Error';
    response.details.componentFailures.problem = 'This component has some problems';
  }

  if (type === 'failedTest') {
    response.status = RequestStatus.Failed;
    response.success = false;
    response.details.componentFailures = cloneJson(baseDeployResponse.details.componentSuccesses[1]) as DeployMessage;
    response.details.componentSuccesses = cloneJson(baseDeployResponse.details.componentSuccesses[0]) as DeployMessage;
    response.details.componentFailures.success = 'false';
    delete response.details.componentFailures.id;
    response.details.componentFailures.problemType = 'Error';
    response.details.componentFailures.problem = 'This component has some problems';
    response.details.runTestResult.numFailures = '1';
    response.runTestsEnabled = true;
    response.numberTestErrors = 1;
    response.details.runTestResult.successes = [];
    response.details.runTestResult.failures = [
      {
        name: 'ChangePasswordController',
        methodName: 'testMethod',
        message: 'testMessage',
        id: 'testId',
        time: 'testTime',
        packageName: 'testPkg',
        stackTrace: 'test stack trace',
        type: 'ApexClass',
      },
    ];
    response.details.runTestResult.codeCoverage = [
      {
        id: 'ChangePasswordController',
        type: 'ApexClass',
        name: 'ChangePasswordController',
        numLocations: '1',
        locationsNotCovered: {
          column: '54',
          line: '2',
          numExecutions: '1',
          time: '2',
        },
        numLocationsNotCovered: '5',
      },
    ];
  }

  if (type === 'passedTest') {
    response.status = RequestStatus.Failed;
    response.success = false;
    response.details.componentFailures = cloneJson(baseDeployResponse.details.componentSuccesses[1]) as DeployMessage;
    response.details.componentSuccesses = cloneJson(baseDeployResponse.details.componentSuccesses[0]) as DeployMessage;
    response.details.componentFailures.success = 'false';
    delete response.details.componentFailures.id;
    response.details.componentFailures.problemType = 'Error';
    response.details.componentFailures.problem = 'This component has some problems';
    response.details.runTestResult.numFailures = '0';
    response.runTestsEnabled = true;
    response.numberTestErrors = 0;
    response.details.runTestResult.successes = [
      {
        name: 'ChangePasswordController',
        methodName: 'testMethod',
        id: 'testId',
        time: 'testTime',
      },
    ];
    response.details.runTestResult.failures = [];
    response.details.runTestResult.codeCoverage = [
      {
        id: 'ChangePasswordController',
        type: 'ApexClass',
        name: 'ChangePasswordController',
        numLocations: '1',
        locationsNotCovered: {
          column: '54',
          line: '2',
          numExecutions: '1',
          time: '2',
        },
        numLocationsNotCovered: '5',
      },
    ];
  }
  if (type === 'passedAndFailedTest') {
    response.status = RequestStatus.Failed;
    response.success = false;
    response.details.componentFailures = cloneJson(baseDeployResponse.details.componentSuccesses[1]) as DeployMessage;
    response.details.componentSuccesses = cloneJson(baseDeployResponse.details.componentSuccesses[0]) as DeployMessage;
    response.details.componentFailures.success = 'false';
    delete response.details.componentFailures.id;
    response.details.componentFailures.problemType = 'Error';
    response.details.componentFailures.problem = 'This component has some problems';
    response.details.runTestResult.numFailures = '2';
    response.runTestsEnabled = true;
    response.numberTestErrors = 2;
    response.details.runTestResult.successes = [
      {
        name: 'ChangePasswordController',
        methodName: 'testMethod',
        id: 'testId',
        time: 'testTime',
      },
    ];
    response.details.runTestResult.failures = [
      {
        name: 'ChangePasswordController',
        methodName: 'testMethod',
        message: 'testMessage',
        id: 'testId',
        time: 'testTime',
        packageName: 'testPkg',
        stackTrace: 'test stack trace',
        type: 'ApexClass',
      },
      {
        name: 'ApexTestClass',
        methodName: 'testMethod',
        message: 'testMessage',
        id: 'testId',
        time: 'testTime',
        packageName: 'testPkg',
        stackTrace: 'test stack trace',
        type: 'ApexClass',
      },
    ];
    response.details.runTestResult.codeCoverage = [
      {
        id: 'ChangePasswordController',
        type: 'ApexClass',
        name: 'ChangePasswordController',
        numLocations: '1',
        locationsNotCovered: {
          column: '54',
          line: '2',
          numExecutions: '1',
          time: '2',
        },
        numLocationsNotCovered: '5',
      },
      {
        id: 'ApexTestClass',
        type: 'ApexClass',
        name: 'ApexTestClass',
        numLocations: '1',
        locationsNotCovered: {
          column: '54',
          line: '2',
          numExecutions: '1',
          time: '2',
        },
        numLocationsNotCovered: '5',
      },
    ];
  }

  return response;
};

export const getDeployResult = (
  type: DeployResponseType,
  overrides?: Partial<MetadataApiDeployStatus>
): DeployResult => {
  const response = getDeployResponse(type, overrides);

  return {
    response,
    getFileResponses() {
      let fileProps: DeployMessage[] = [];
      if (type === 'failed') {
        const failures = response.details.componentFailures || [];
        fileProps = toArray(failures);
        return fileProps.map((comp) => ({
          fullName: comp.fullName,
          filePath: comp.fileName,
          state: 'Failed',
          type: comp.componentType,
          error: comp.problem,
          problemType: comp.problemType,
        }));
      } else {
        const successes = response.details.componentSuccesses;
        fileProps = toArray(successes);
        return fileProps
          .filter((p) => p.fileName !== 'package.xml')
          .map((comp) => ({
            fullName: comp.fullName,
            filePath: comp.fileName,
            state: 'Changed',
            type: comp.componentType,
          }));
      }
    },
  } as DeployResult;
};
