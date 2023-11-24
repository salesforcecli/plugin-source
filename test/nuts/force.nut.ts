/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
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
