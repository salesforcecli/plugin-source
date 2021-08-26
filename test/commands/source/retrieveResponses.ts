/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { RetrieveResult } from '@salesforce/source-deploy-retrieve';
import { RequestStatus, MetadataApiRetrieveStatus } from '@salesforce/source-deploy-retrieve';
import { toArray } from '../../../src/formatters/resultFormatter';

const packageFileProp = {
  createdById: '00521000007KA39AAG',
  createdByName: 'User User',
  createdDate: '2021-04-28T17:12:58.964Z',
  fileName: 'unpackaged/package.xml',
  fullName: 'unpackaged/package.xml',
  id: '',
  lastModifiedById: '00521000007KA39AAG',
  lastModifiedByName: 'User User',
  lastModifiedDate: '2021-04-28T17:12:58.964Z',
  manageableState: 'unmanaged',
  type: 'Package',
};

const apexClassFileProp = {
  createdById: '00521000007KA39AAG',
  createdByName: 'User User',
  createdDate: '2021-04-23T18:55:07.000Z',
  fileName: 'unpackaged/classes/ProductController.cls',
  fullName: 'ProductController',
  id: '01p2100000A6XiqAAF',
  lastModifiedById: '00521000007KA39AAG',
  lastModifiedByName: 'User User',
  lastModifiedDate: '2021-04-27T22:18:05.000Z',
  manageableState: 'unmanaged',
  type: 'ApexClass',
};

const baseRetrieveResponse = {
  done: true,
  fileProperties: [apexClassFileProp, packageFileProp],
  id: '09S21000002jxznEAA',
  status: 'Succeeded',
  success: true,
};

const warningMessage = "Entity of type 'ApexClass' named 'ProductController' cannot be found";

export type RetrieveResponseType = 'success' | 'inProgress' | 'failed' | 'empty' | 'warnings';

export const getRetrieveResponse = (
  type: RetrieveResponseType,
  overrides?: Partial<MetadataApiRetrieveStatus>
): MetadataApiRetrieveStatus => {
  const response = { ...baseRetrieveResponse, ...overrides };

  if (type === 'inProgress') {
    response.status = RequestStatus.InProgress;
    response.done = false;
    response.success = false;
  }

  if (type === 'failed') {
    response.status = RequestStatus.Failed;
    response.done = true;
    response.success = false;
  }

  if (type === 'empty') {
    response.fileProperties = [];
  }

  if (type === 'warnings') {
    response.messages = {
      fileName: packageFileProp.fileName,
      problem: warningMessage,
    };
    response.fileProperties = [packageFileProp];
  }

  return response as MetadataApiRetrieveStatus;
};

export const getRetrieveResult = (
  type: RetrieveResponseType,
  overrides?: Partial<MetadataApiRetrieveStatus>
): RetrieveResult => {
  const response = getRetrieveResponse(type, overrides);

  return {
    response,
    getFileResponses() {
      let fileProps = response.fileProperties;
      fileProps = toArray(fileProps);
      return fileProps
        .filter((p) => p.type !== 'Package')
        .map((comp) => {
          if (type === 'warnings') {
            return {
              fullName: apexClassFileProp.fullName,
              state: 'Failed',
              type: apexClassFileProp.type,
              error: warningMessage,
              problemType: 'Error',
            };
          } else {
            return {
              fullName: comp.fullName,
              filePath: comp.fileName,
              state: 'Changed',
              type: comp.type,
            };
          }
        });
    },
  } as RetrieveResult;
};
