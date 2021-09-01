/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

export const exampleSourceComponent = {
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

export const exampleDeployResponse = {
  result: {
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
        {
          changed: 'false',
          componentType: 'CustomField',
          created: 'false',
          createdDate: '2021-04-09T20:23:02.000Z',
          deleted: 'false',
          fileName: 'sdx_sourceDeploy_pkg_1617999776176/objects/Property__c.object',
          fullName: 'Property__c.Price__c',
          id: '00N1h00000ApoBOEAZ',
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
    status: 'Canceled',
    success: false,
  },
  status: 0,
};

export const exampleDeleteResponse = {
  result: {
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
    status: 'Canceled',
    success: false,
  },
  status: 0,
};
