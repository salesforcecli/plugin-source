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
