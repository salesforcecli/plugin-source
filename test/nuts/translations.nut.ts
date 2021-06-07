/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as path from 'path';
// import { use, expect } from 'chai';

import { TestSession, execCmd } from '@salesforce/cli-plugins-testkit';

let session: TestSession;

describe('deploys and retrieves source code for translation metadata', () => {
  before(async () => {
    session = await TestSession.create({
      project: {
        sourceDir: path.join('test', 'nuts', 'translationTestProject'),
      },
      // create org and push source to get a permset
      setupCommands: [`sfdx force:org:create -d 1 -s -f ${path.join('config', 'project-scratch-def.json')}`],
    });
  });

  it('can deploy all the source data to a new scratch org', () => {
    execCmd('force:source:deploy -p force-app', {
      ensureExitCode: 0,
    }).jsonOutput;
  });

  it('can retrieve all the source data to a new scratch org', () => {
    execCmd('force:source:retrieve -p force-app', {
      ensureExitCode: 0,
    }).jsonOutput;
  });

  it('can deploy the retrieved source data to the same org', () => {
    execCmd('force:source:deploy -p force-app', {
      ensureExitCode: 0,
    }).jsonOutput;
  });

  after(async () => {
    await session?.zip(undefined, 'artifacts');
    await session?.clean();
  });
});
