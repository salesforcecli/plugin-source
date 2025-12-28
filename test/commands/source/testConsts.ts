/*
 * Copyright 2025, Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { ComponentProperties } from '@salesforce/source-deploy-retrieve/lib/src/resolve/sourceComponent.js';

export const exampleSourceComponent: ComponentProperties = {
  name: 'GeocodingService',
  type: {
    id: 'apexclass',
    name: 'ApexClass',
    suffix: 'cls',
    directoryName: 'classes',
    inFolder: false,
    strictDirectoryName: false,
    strategies: {
      adapter: 'matchingContentFile',
    },
  },
  xml: '/dreamhouse-lwc/force-app/main/default/classes/GeocodingService.cls-meta.xml',
  content: '/dreamhouse-lwc/force-app/main/default/classes/GeocodingService.cls',
};

export const exampleDeleteResponse = {
  // required but ignored by the delete UT
  getFileResponses: (): void => {},
  response: {
    canceledBy: '0051h000006BHOq',
    canceledByName: 'User User',
    checkOnly: false,
    completedDate: '2021-04-09T20:23:05.000Z',
    createdBy: '0051h000006BHOq',
    createdByName: 'User User',
    createdDate: '2021-04-09T20:22:58.000Z',
    details: {
      componentSuccesses: [
        {
          changed: 'false',
          componentType: 'CustomField',
          created: 'false',
          createdDate: '2021-04-09T20:23:02.000Z',
          deleted: 'false',
          fileName: 'sdx_sourceDeploy_pkg_1617999776176/objects/Property__c.object',
          fullName: 'Property__c.Picture__c',
          id: '00N1h00000ApoBMEAZ',
          success: 'true',
        },
        {
          changed: 'false',
          componentType: 'CustomField',
          created: 'false',
          createdDate: '2021-04-09T20:23:02.000Z',
          deleted: 'false',
          fileName: 'sdx_sourceDeploy_pkg_1617999776176/objects/Property__c.object',
          fullName: 'Property__c.Baths__c',
          id: '00N1h00000ApoAuEAJ',
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
    id: '0Af1h00000fCQgsCAG',
    ignoreWarnings: false,
    lastModifiedDate: '2021-04-09T20:23:05.000Z',
    numberComponentErrors: 0,
    numberComponentsDeployed: 32,
    numberComponentsTotal: 86,
    numberTestErrors: 0,
    numberTestsCompleted: 5,
    numberTestsTotal: 10,
    rollbackOnError: true,
    runTestsEnabled: false,
    startDate: '2021-04-09T20:22:58.000Z',
    status: 'Succeeded',
    success: true,
  },
  status: 0,
};
