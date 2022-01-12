/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { Logger } from '@salesforce/core';
import { UX } from '@salesforce/command';
import { stubInterface } from '@salesforce/ts-sinon';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { StatusResult, StatusFormatter } from '../../src/formatters/statusFormatter';

const fakeResult: StatusResult[] = [
  {
    fullName: 'ignoredProfile',
    type: 'Profile',
    origin: 'Remote',
    ignored: true,
    actualState: 'Add',
    state: 'Remote Add',
  },
  {
    fullName: 'regularProfile',
    type: 'Profile',
    origin: 'Remote',
    ignored: false,
    actualState: 'Add',
    state: 'Remote Add',
  },
];

describe('status results', () => {
  const sandbox = sinon.createSandbox();
  let ux;
  const logger = Logger.childFromRoot('retrieveTestLogger').useMemoryLogging();
  let logStub: sinon.SinonStub;
  let tableStub: sinon.SinonStub;

  beforeEach(() => {
    logStub = sandbox.stub();
    tableStub = sandbox.stub();

    ux = stubInterface<UX>(sandbox, {
      log: logStub,
      table: tableStub,
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('returns expected json', () => {
    const formatter = new StatusFormatter(logger, ux, {}, fakeResult);
    expect(formatter.getJson()).deep.equal(fakeResult);
  });

  describe('human display', () => {
    it('includes ignored files without the concise option', () => {
      const formatter = new StatusFormatter(logger, ux, { concise: false }, fakeResult);
      formatter.display();
      expect(tableStub.callCount).to.equal(1);
      expect(tableStub.firstCall.args[0]).to.have.equal(fakeResult);
    });
    it('omits ignored files with the concise option', () => {
      const formatter = new StatusFormatter(logger, ux, { concise: true }, fakeResult);
      formatter.display();
      expect(tableStub.callCount).to.equal(1);
      expect(tableStub.firstCall.args[0]).to.deep.equal([fakeResult[1]]);
    });
    it('shows no results when there are none', () => {
      const formatter = new StatusFormatter(logger, ux, { concise: false }, []);
      formatter.display();
      expect(logStub.callCount).to.equal(1);
      expect(logStub.firstCall.args[0]).to.contain('No local or remote changes found.');
    });
    it('shows no results when there are none because concise omitted them', () => {
      const formatter = new StatusFormatter(logger, ux, { concise: true }, [fakeResult[0]]);
      formatter.display();
      expect(logStub.callCount).to.equal(1);
      expect(logStub.firstCall.args[0]).to.contain('No local or remote changes found.');
    });
  });
});
