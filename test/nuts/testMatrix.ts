/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import { which } from 'shelljs';
import { Env } from '@salesforce/kit';

type GlobPattern = string; // see: https://github.com/mrmlnc/fast-glob#pattern-syntax

type DeployTestCase = {
  toDeploy: string;
  toVerify: GlobPattern[];
};

type RetrieveTestCase = {
  toRetrieve: string;
  toVerify: GlobPattern[];
};

type TestCase = DeployTestCase & RetrieveTestCase;

export type RepoConfig = {
  skip?: boolean;
  gitUrl: string;
  deploy: {
    metadata: DeployTestCase[];
    sourcepath: DeployTestCase[];
    manifest: DeployTestCase[];
    testlevel: { specifiedTests: string[] };
  };
  retrieve: {
    metadata: RetrieveTestCase[];
    sourcepath: RetrieveTestCase[];
    manifest: RetrieveTestCase[];
  };
};

export const TEST_REPOS: RepoConfig[] = [
  {
    skip: false,
    gitUrl: 'https://github.com/mdonnalley/simple-mpd-project.git',
    deploy: {
      sourcepath: normalizeFilePaths([
        { toDeploy: 'force-app,my-app', toVerify: ['force-app/**/*', 'my-app/**/*'] },
        { toDeploy: '"force-app, my-app"', toVerify: ['force-app/**/*', 'my-app/**/*'] },
        { toDeploy: 'force-app/main/default/objects', toVerify: ['force-app/main/default/objects/**/*'] },
        { toDeploy: 'my-app/objects', toVerify: ['my-app/objects/**/*'] },
        { toDeploy: 'my-app/apex/my.cls-meta.xml', toVerify: ['my-app/apex/my.cls-meta.xml'] },
      ]),
      metadata: normalizeFilePaths([
        { toDeploy: 'CustomObject', toVerify: ['force-app/main/default/objects/**/*', 'my-app/objects/**/*'] },
      ]),
      manifest: normalizeFilePaths([
        { toDeploy: 'force-app', toVerify: ['force-app/**/*'] },
        { toDeploy: 'my-app', toVerify: ['my-app/**/*'] },
        { toDeploy: 'force-app,my-app', toVerify: ['force-app/**/*', 'my-app/**/*'] },
      ]),
      testlevel: { specifiedTests: ['MyTest'] },
    },
    retrieve: {
      sourcepath: normalizeFilePaths([
        { toRetrieve: 'force-app,my-app', toVerify: ['force-app/**/*', 'my-app/**/*'] },
        { toRetrieve: '"force-app, my-app"', toVerify: ['force-app/**/*', 'my-app/**/*'] },
        { toRetrieve: 'force-app/main/default/objects', toVerify: ['force-app/main/default/objects/*__c/*'] },
        { toRetrieve: 'my-app/objects', toVerify: ['my-app/objects/*__c/*'] },
        { toRetrieve: 'my-app/apex/my.cls-meta.xml', toVerify: ['my-app/apex/my.cls-meta.xml'] },
      ]),
      metadata: normalizeFilePaths([
        {
          toRetrieve: 'CustomObject',
          toVerify: ['force-app/main/default/objects/*__c/*', 'my-app/objects/*__c/*'],
        },
      ]),
      manifest: normalizeFilePaths([
        { toRetrieve: 'force-app', toVerify: ['force-app/**/*'] },
        { toRetrieve: 'my-app', toVerify: ['my-app/**/*'] },
        { toRetrieve: 'force-app,my-app', toVerify: ['force-app/**/*', 'my-app/**/*'] },
      ]),
    },
  },
  {
    skip: true,
    gitUrl: 'https://github.com/trailheadapps/dreamhouse-sfdx.git',
    deploy: {
      sourcepath: normalizeFilePaths([
        { toDeploy: 'force-app', toVerify: ['force-app/main/default/**/*'] },
        { toDeploy: 'force-app/main/default/classes', toVerify: ['force-app/main/default/classes/**/*'] },
        {
          toDeploy: 'force-app/main/default/classes,force-app/main/default/objects',
          toVerify: ['force-app/main/default/classes/*', 'force-app/main/default/objects/**/*'],
        },
        {
          toDeploy: '"force-app/main/default/classes, force-app/main/default/permissionsets"',
          toVerify: ['force-app/main/default/classes/*', 'force-app/main/default/permissionsets/*'],
        },
        {
          toDeploy: 'force-app/main/default/permissionsets/dreamhouse.permissionset-meta.xml',
          toVerify: ['force-app/main/default/permissionsets/dreamhouse.permissionset-meta.xml'],
        },
      ]),
      metadata: normalizeFilePaths([
        { toDeploy: 'ApexClass', toVerify: ['force-app/main/default/classes/*'] },
        {
          toDeploy: 'CustomObject:Bot_Command__c',
          toVerify: ['force-app/main/default/objects/Bot_Command__c/*'],
        },
        {
          toDeploy: 'ApexClass,CustomObject:Bot_Command__c',
          toVerify: ['force-app/main/default/classes/*', 'force-app/main/default/objects/Bot_Command__c/*'],
        },
        {
          toDeploy: 'ApexClass:BotController,CustomObject',
          toVerify: ['force-app/main/default/classes/BotController.cls', 'force-app/main/default/objects/*'],
        },
        {
          toDeploy: '"ApexClass:BotController, CustomObject, PermissionSet"',
          toVerify: [
            'force-app/main/default/classes/BotController.cls',
            'force-app/main/default/objects/*',
            'force-app/main/default/permissionsets/*',
          ],
        },
      ]),
      manifest: normalizeFilePaths([
        { toDeploy: 'force-app', toVerify: ['force-app/**/*'] },
        {
          toDeploy: 'force-app/main/default/classes,force-app/main/default/objects',
          toVerify: ['force-app/main/default/classes/*', 'force-app/main/default/objects/*'],
        },
        {
          toDeploy:
            '"force-app/main/default/objects, force-app/main/default/permissionsets/dreamhouse.permissionset-meta.xml"',
          toVerify: [
            'force-app/main/default/objects/*',
            'force-app/main/default/permissionsets/dreamhouse.permissionset-meta.xml',
          ],
        },
      ]),
      testlevel: { specifiedTests: ['BotTest'] },
    },
    retrieve: {
      sourcepath: normalizeFilePaths([
        { toRetrieve: 'force-app', toVerify: ['force-app/main/default/**/*'] },
        { toRetrieve: 'force-app/main/default/classes', toVerify: ['force-app/main/default/classes/*'] },
        {
          toRetrieve: 'force-app/main/default/classes,force-app/main/default/objects',
          toVerify: ['force-app/main/default/classes/*', 'force-app/main/default/objects/*__c/*'],
        },
        {
          toRetrieve: '"force-app/main/default/classes, force-app/main/default/permissionsets"',
          toVerify: ['force-app/main/default/classes/*', 'force-app/main/default/permissionsets/*'],
        },
        {
          toRetrieve: 'force-app/main/default/permissionsets/dreamhouse.permissionset-meta.xml',
          toVerify: ['force-app/main/default/permissionsets/dreamhouse.permissionset-meta.xml'],
        },
      ]),
      metadata: normalizeFilePaths([
        { toRetrieve: 'ApexClass', toVerify: ['force-app/main/default/classes/*'] },
        {
          toRetrieve: 'CustomObject:Bot_Command__c',
          toVerify: ['force-app/main/default/objects/Bot_Command__c/*'],
        },
        {
          toRetrieve: 'ApexClass,CustomObject:Bot_Command__c',
          toVerify: ['force-app/main/default/classes/*', 'force-app/main/default/objects/Bot_Command__c/*'],
        },
        {
          toRetrieve: 'ApexClass:BotController,CustomObject',
          toVerify: ['force-app/main/default/classes/BotController.cls', 'force-app/main/default/objects/*__c/*'],
        },
        {
          toRetrieve: '"ApexClass:BotController, CustomObject, PermissionSet"',
          toVerify: [
            'force-app/main/default/classes/BotController.cls',
            'force-app/main/default/objects/*__c/*',
            'force-app/main/default/permissionsets/*',
          ],
        },
      ]),
      manifest: normalizeFilePaths([
        { toRetrieve: 'force-app', toVerify: ['force-app/**/*'] },
        {
          toRetrieve: 'force-app/main/default/classes,force-app/main/default/objects',
          toVerify: ['force-app/main/default/classes/*', 'force-app/main/default/objects/*'],
        },
        {
          toRetrieve:
            '"force-app/main/default/objects, force-app/main/default/permissionsets/dreamhouse.permissionset-meta.xml"',
          toVerify: [
            'force-app/main/default/objects/*',
            'force-app/main/default/permissionsets/dreamhouse.permissionset-meta.xml',
          ],
        },
      ]),
    },
  },
  {
    skip: true,
    gitUrl: 'https://github.com/trailheadapps/dreamhouse-lwc.git',
    deploy: {
      sourcepath: normalizeFilePaths([
        { toDeploy: 'force-app', toVerify: ['force-app/main/default/**!(__tests__)/*'] },
        { toDeploy: 'force-app/main/default/classes', toVerify: ['force-app/main/default/classes/**/*'] },
        {
          toDeploy: 'force-app/main/default/classes,force-app/main/default/objects',
          toVerify: ['force-app/main/default/classes/*', 'force-app/main/default/objects/**/*'],
        },
        {
          toDeploy: '"force-app/main/default/classes, force-app/main/default/permissionsets"',
          toVerify: ['force-app/main/default/classes/*', 'force-app/main/default/permissionsets/*'],
        },
        {
          toDeploy: 'force-app/main/default/permissionsets/dreamhouse.permissionset-meta.xml',
          toVerify: ['force-app/main/default/permissionsets/dreamhouse.permissionset-meta.xml'],
        },
      ]),
      metadata: normalizeFilePaths([
        { toDeploy: 'ApexClass', toVerify: ['force-app/main/default/classes/*'] },
        {
          toDeploy: 'CustomObject:Broker__c',
          toVerify: ['force-app/main/default/objects/Broker__c/*'],
        },
        {
          toDeploy: 'ApexClass,CustomObject:Broker__c',
          toVerify: ['force-app/main/default/classes/*', 'force-app/main/default/objects/Broker__c/*'],
        },
        {
          toDeploy: 'ApexClass:GeocodingService,CustomObject',
          toVerify: ['force-app/main/default/classes/GeocodingService.cls', 'force-app/main/default/objects/*'],
        },
        {
          toDeploy: '"ApexClass:GeocodingService, CustomObject, PermissionSet"',
          toVerify: [
            'force-app/main/default/classes/GeocodingService.cls',
            'force-app/main/default/objects/*',
            'force-app/main/default/permissionsets/*',
          ],
        },
      ]),
      manifest: normalizeFilePaths([
        { toDeploy: 'force-app', toVerify: ['force-app/main/default/**!(__tests__)/*'] },
        {
          toDeploy: 'force-app/main/default/classes,force-app/main/default/objects',
          toVerify: ['force-app/main/default/classes/*', 'force-app/main/default/objects/*'],
        },
        {
          toDeploy:
            '"force-app/main/default/objects, force-app/main/default/permissionsets/dreamhouse.permissionset-meta.xml"',
          toVerify: [
            'force-app/main/default/objects/*',
            'force-app/main/default/permissionsets/dreamhouse.permissionset-meta.xml',
          ],
        },
      ]),
      testlevel: { specifiedTests: ['BotTest'] },
    },
    retrieve: {
      sourcepath: normalizeFilePaths([
        { toRetrieve: 'force-app', toVerify: ['force-app/main/default/**!(__tests__)/*'] },
        { toRetrieve: 'force-app/main/default/classes', toVerify: ['force-app/main/default/classes/*'] },
        {
          toRetrieve: 'force-app/main/default/classes,force-app/main/default/objects',
          toVerify: ['force-app/main/default/classes/*', 'force-app/main/default/objects/*__c/*'],
        },
        {
          toRetrieve: '"force-app/main/default/classes, force-app/main/default/permissionsets"',
          toVerify: ['force-app/main/default/classes/*', 'force-app/main/default/permissionsets/*'],
        },
        {
          toRetrieve: 'force-app/main/default/permissionsets/dreamhouse.permissionset-meta.xml',
          toVerify: ['force-app/main/default/permissionsets/dreamhouse.permissionset-meta.xml'],
        },
      ]),
      metadata: normalizeFilePaths([
        { toRetrieve: 'ApexClass', toVerify: ['force-app/main/default/classes/*'] },
        {
          toRetrieve: 'CustomObject:Broker__c',
          toVerify: ['force-app/main/default/objects/Broker__c/*'],
        },
        {
          toRetrieve: 'ApexClass,CustomObject:Broker__c',
          toVerify: ['force-app/main/default/classes/*', 'force-app/main/default/objects/Broker__c/*'],
        },
        {
          toRetrieve: 'ApexClass:GeocodingService,CustomObject',
          toVerify: ['force-app/main/default/classes/GeocodingService.cls', 'force-app/main/default/objects/*__c/*'],
        },
        {
          toRetrieve: '"ApexClass:GeocodingService, CustomObject, PermissionSet"',
          toVerify: [
            'force-app/main/default/classes/GeocodingService.cls',
            'force-app/main/default/objects/*__c/*',
            'force-app/main/default/permissionsets/*',
          ],
        },
      ]),
      manifest: normalizeFilePaths([
        { toRetrieve: 'force-app', toVerify: ['force-app/main/default/**!(__tests__)/*'] },
        {
          toRetrieve: 'force-app/main/default/classes,force-app/main/default/objects',
          toVerify: ['force-app/main/default/classes/*', 'force-app/main/default/objects/*'],
        },
        {
          toRetrieve:
            '"force-app/main/default/objects, force-app/main/default/permissionsets/dreamhouse.permissionset-meta.xml"',
          toVerify: [
            'force-app/main/default/objects/*',
            'force-app/main/default/permissionsets/dreamhouse.permissionset-meta.xml',
          ],
        },
      ]),
    },
  },
  // { gitUrl: 'https://github.com/trailheadapps/ebikes-lwc.git' },
  // { gitUrl: 'https://github.com/trailheadapps/ecars.git' },
];

function normalizeFilePaths(testCases: RetrieveTestCase[]): RetrieveTestCase[];
function normalizeFilePaths(testCases: DeployTestCase[]): DeployTestCase[];
function normalizeFilePaths(testCases: TestCase[]): TestCase[] {
  return testCases.map((testCase) => {
    if (testCase.toDeploy) {
      return {
        toDeploy: testCase.toDeploy.split(',').map(normalize).join(','),
        toVerify: testCase.toVerify,
      };
    } else {
      return {
        toRetrieve: testCase.toRetrieve.split(',').map(normalize).join(','),
        toVerify: testCase.toVerify,
      };
    }
  }) as TestCase[];
}

function normalize(filePath: string) {
  return path.join(...filePath.split('/'));
}

const env = new Env();

export const EXECUTABLES = [
  {
    path: which('sfdx').stdout, // the full path to the sfdx executable
    skip: !env.getBoolean('PLUGIN_SOURCE_TEST_SFDX', true),
  },
  {
    path: path.join(process.cwd(), 'bin', 'run'), // path to the plugin's bin/run executable
    skip: !env.getBoolean('PLUGIN_SOURCE_TEST_BIN_RUN', false),
  },
];
