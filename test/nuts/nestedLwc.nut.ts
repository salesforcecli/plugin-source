/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import path from 'node:path';
import { expect } from 'chai';
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { DeployCommandResult } from '../../src/formatters/deployResultFormatter.js';
import { PushResponse } from '../../src/formatters/source/pushResultFormatter.js';

describe('Nested LWCs', () => {
  let session: TestSession;

  before(async () => {
    session = await TestSession.create({
      project: {
        sourceDir: path.join(process.cwd(), 'test', 'nuts', 'nestedLWCProject'),
      },
      devhubAuthStrategy: 'AUTO',
      scratchOrgs: [
        {
          setDefault: true,
          config: path.join('config', 'project-scratch-def.json'),
        },
      ],
    });
  });

  it('pushes nested LWC', () => {
    const pushResults = execCmd<PushResponse>('force:source:push --json', { ensureExitCode: 0 }).jsonOutput?.result;
    expect(pushResults?.pushedSource.some((r) => r.fullName === 'cmpA')).to.be.true;
    expect(pushResults?.pushedSource.some((r) => r.fullName === 'cmpB')).to.be.true;
  });

  it('deploys nested LWC', () => {
    const deployResults = execCmd<DeployCommandResult>('force:source:deploy --json -p force-app', {
      ensureExitCode: 0,
    }).jsonOutput?.result;
    expect(deployResults?.deployedSource.some((r) => r.fullName === 'cmpA')).to.be.true;
    expect(deployResults?.deployedSource.some((r) => r.fullName === 'cmpB')).to.be.true;
  });

  after(async () => {
    await session?.clean();
  });
});
