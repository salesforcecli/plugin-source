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

import { expect } from 'chai';

import { TestSession, execCmd } from '@salesforce/cli-plugins-testkit';

describe('force command', () => {
  let session: TestSession;

  before(async () => {
    session = await TestSession.create({
      project: {
        name: 'forceNut',
      },
    });
  });
  it('returns an apiVersion in JSON', () => {
    const result = execCmd<{ apiVersion: string }>('force --json', { ensureExitCode: 0, cli: 'dev' }).jsonOutput
      ?.result;
    expect(result).to.be.an('object').that.has.all.keys('apiVersion');
    expect(result?.apiVersion).to.match(/^\d{2,}\.0$/);
    expect(parseInt(result?.apiVersion ?? '', 10)).to.be.greaterThan(53);
  });
  it('executes the cloud/links without JSON', () => {
    const result = execCmd('force', { ensureExitCode: 0, cli: 'dev' }).shellOutput as string;
    expect(result).to.include('Salesforce CLI Release Notes');
  });

  after(async () => {
    await session.clean();
  });
});
