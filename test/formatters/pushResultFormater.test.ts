/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { expect } from 'chai';
import { Logger } from '@salesforce/core';
import { UX } from '@salesforce/command';
import * as sinon from 'sinon';
import { stubInterface } from '@salesforce/ts-sinon';
import { getDeployResult } from '../commands/source/deployResponses';
import { PushResultFormatter } from '../../src/formatters/pushResultFormatter';

describe('PushResultFormatter', () => {
  const logger = Logger.childFromRoot('deployTestLogger').useMemoryLogging();
  const deployResultSuccess = getDeployResult('successSync');
  const deployResultFailure = getDeployResult('failed');

  const sandbox = sinon.createSandbox();

  let uxMock;
  let tableStub: sinon.SinonStub;
  beforeEach(() => {
    tableStub = sandbox.stub();
    uxMock = stubInterface<UX>(sandbox, {
      table: tableStub,
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('json', () => {
    it('returns expected json for success', () => {
      const formatter = new PushResultFormatter(logger, new UX(logger), {}, deployResultSuccess);
      // expect(formatter.getJson()).to.have.lengthOf(1);
      expect(formatter.getJson()).to.deep.equal([
        {
          filePath: 'classes/ProductController.cls',
          fullName: 'ProductController',
          state: 'Changed',
          type: 'ApexClass',
        },
      ]);
    });
    describe('json with quiet', () => {
      it('honors quiet flag for json successes', () => {
        const formatter = new PushResultFormatter(logger, new UX(logger), { quiet: true }, deployResultSuccess);
        expect(formatter.getJson()).to.deep.equal([]);
      });
      it('honors quiet flag for json successes', () => {
        const formatter = new PushResultFormatter(logger, new UX(logger), { quiet: true }, deployResultFailure);
        expect(formatter.getJson()).to.have.length(1);
      });
    });
  });

  describe('human output', () => {
    it('returns expected output for success', () => {
      const formatter = new PushResultFormatter(logger, uxMock as UX, {}, deployResultSuccess);
      formatter.display();
      expect(tableStub.callCount).to.equal(1);
    });
    describe('quiet', () => {
      it('does not display successes for quiet', () => {
        const formatter = new PushResultFormatter(logger, uxMock as UX, { quiet: true }, deployResultSuccess);
        formatter.display();
        expect(tableStub.callCount).to.equal(0);
      });
      it('displays errors for quiet', () => {
        const formatter = new PushResultFormatter(logger, uxMock as UX, { quiet: true }, deployResultFailure);
        formatter.display();
        expect(tableStub.callCount).to.equal(1);
      });
    });
  });
});
