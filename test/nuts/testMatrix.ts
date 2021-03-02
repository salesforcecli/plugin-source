/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import { which } from 'shelljs';
import { Env } from '@salesforce/kit';

type DeployTestCase = {
  toDeploy: string;
  toVerify: string[];
};

export type RepoConfig = {
  skip?: boolean;
  gitUrl: string;
  deploy: {
    metadata: DeployTestCase[];
    sourcepath: DeployTestCase[];
  };
};

export const TEST_REPOS: RepoConfig[] = [
  {
    gitUrl: 'https://github.com/amphro/simple-mpd-project.git',
    deploy: {
      sourcepath: normalizeFilePaths([
        { toDeploy: 'force-app,my-app', toVerify: ['force-app', 'my-app'] },
        { toDeploy: 'force-app/main/default/objects', toVerify: ['force-app/main/default/objects'] },
        { toDeploy: 'my-app/objects', toVerify: ['my-app/objects'] },
      ]),
      metadata: normalizeFilePaths([
        { toDeploy: 'CustomObject', toVerify: ['force-app/main/default/objects', 'my-app/objects'] },
      ]),
    },
  },
  {
    gitUrl: 'https://github.com/trailheadapps/dreamhouse-sfdx.git',
    deploy: {
      sourcepath: normalizeFilePaths([
        { toDeploy: 'force-app', toVerify: ['force-app/main/default'] },
        { toDeploy: 'force-app/main/default/classes', toVerify: ['force-app/main/default/classes'] },
      ]),
      metadata: normalizeFilePaths([
        { toDeploy: 'ApexClass', toVerify: ['force-app/main/default/classes'] },
        {
          toDeploy: 'CustomObject:Bot_Command__c',
          toVerify: ['force-app/main/default/objects/Bot_Command__c'],
        },
        {
          toDeploy: 'ApexClass,CustomObject:Bot_Command__c',
          toVerify: ['force-app/main/default/classes', 'force-app/main/default/objects/Bot_Command__c'],
        },
        {
          toDeploy: 'ApexClass:BotController,CustomObject',
          toVerify: ['force-app/main/default/classes/BotController.cls', 'force-app/main/default/objects'],
        },
      ]),
    },
  },
  // { gitUrl: 'https://github.com/trailheadapps/ebikes-lwc.git' },
  // { gitUrl: 'https://github.com/trailheadapps/ecars.git' },
  // { gitUrl: 'https://github.com/trailheadapps/dreamhouse-lwc.git' },
];

function normalizeFilePaths(testCases: DeployTestCase[]): DeployTestCase[] {
  return testCases.map((testCase) => {
    return {
      toDeploy: normalize(testCase.toDeploy),
      toVerify: testCase.toVerify.map(normalize),
    };
  });
}

function normalize(filePath: string) {
  return path.join(...filePath.split('/'));
}

const env = new Env();

export const EXECUTABLES = [
  {
    path: which('sfdx').stdout, // the full path to the sfdx executable
    skip: env.getBoolean('PLUGIN_SOURCE_TEST_SFDX', false),
  },
  {
    path: path.join(process.cwd(), 'bin', 'run'), // path to the plugin's bin/run executable
    skip: env.getBoolean('PLUGIN_SOURCE_TEST_BIN_RUN', true),
  },
];
