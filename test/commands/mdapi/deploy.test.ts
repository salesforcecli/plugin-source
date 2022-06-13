/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as sinon from 'sinon';
import { expect } from 'chai';
import { Messages } from '@salesforce/core';
import { Deploy } from '../../../src/commands/force/mdapi/deploy';

Messages.importMessagesDirectory(__dirname);

describe('force:mdapi:deploy', () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  it('should remove undefined TestLevel key', async () => {
    const result = Deploy.removeUndefinedKeyValues({
      checkOnly: false,
      ignoreWarnings: false,
      purgeOnDelete: false,
      rest: false,
      rollbackOnError: true,
      runTests: [undefined],
      singlePackage: false,
      testLevel: undefined,
    });
    expect(result).to.deep.equal({
      checkOnly: false,
      ignoreWarnings: false,
      purgeOnDelete: false,
      rest: false,
      rollbackOnError: true,
      runTests: [null],
      singlePackage: false,
    });
  });

  it('should keep TestLevel flag', async () => {
    const result = Deploy.removeUndefinedKeyValues({
      checkOnly: false,
      ignoreWarnings: false,
      purgeOnDelete: false,
      rest: false,
      rollbackOnError: true,
      runTests: [undefined],
      singlePackage: false,
      testLevel: 'RunAllTestsInOrg',
    });
    expect(result).to.deep.equal({
      checkOnly: false,
      ignoreWarnings: false,
      purgeOnDelete: false,
      rest: false,
      rollbackOnError: true,
      runTests: [null],
      singlePackage: false,
      testLevel: 'RunAllTestsInOrg',
    });
  });
});
