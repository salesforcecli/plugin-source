/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { RetrieveResult } from '@salesforce/source-deploy-retrieve';
import { RequestStatus } from '@salesforce/source-deploy-retrieve/lib/src/client/types';
import { MetadataApiRetrieveStatus } from '@salesforce/source-deploy-retrieve/lib/src/client/types';

const baseRetrieveResponse = {
  done: true,
  fileProperties: [
    {
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
    },
    {
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
    },
  ],
  id: '09S21000002jxznEAA',
  status: 'Succeeded',
  success: true,
  zipFile: 'UEsDBBQA...some_long_string',
};

export type RetrieveResponseType = 'success' | 'inProgress' | 'failed' | 'empty';

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
      fileProps = Array.isArray(fileProps) ? fileProps : [fileProps];
      return fileProps
        .filter((p) => p.type !== 'Package')
        .map((comp) => ({
          fullName: comp.fullName,
          filePath: comp.fileName,
          state: 'Changed',
          type: comp.type,
        }));
    },
  } as RetrieveResult;
};
