/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { DeployResult } from '@salesforce/source-deploy-retrieve';
import { MetadataApiDeployStatus, RequestStatus } from '@salesforce/source-deploy-retrieve/lib/src/client/types';

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
  | 'failed';

export const getDeployResponse = (
  type: DeployResponseType,
  overrides?: Partial<MetadataApiDeployStatus>
): MetadataApiDeployStatus => {
  const response = { ...baseDeployResponse, ...overrides };

  if (type === 'canceled') {
    response.canceledBy = '0051h000006BHOq';
    response.canceledByName = 'Canceling User';
    response.status = RequestStatus.Canceled;
  }

  return response as MetadataApiDeployStatus;
};

export const getDeployResult = (
  type: DeployResponseType,
  overrides?: Partial<MetadataApiDeployStatus>
): DeployResult => {
  const response = getDeployResponse(type, overrides);

  return {
    response,
    getFileResponses() {
      let successes = response.details.componentSuccesses;
      successes = Array.isArray(successes) ? successes : [successes];
      return successes.map((comp) => ({
        fullName: comp.fullName,
        filePath: comp.fileName,
        state: 'Changed',
        type: comp.componentType,
      }));
    },
  } as DeployResult;
};
