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
import { PushResultFormatter } from '../../src/formatters/source/pushResultFormatter';

describe('PushResultFormatter', () => {
  const logger = Logger.childFromRoot('deployTestLogger').useMemoryLogging();
  const deployResultSuccess = [getDeployResult('successSync')];
  const deployResultFailure = [getDeployResult('failed')];

  const sandbox = sinon.createSandbox();

  let uxMock;
  let tableStub: sinon.SinonStub;
  let headerStub: sinon.SinonStub;
  beforeEach(() => {
    tableStub = sandbox.stub();
    headerStub = sandbox.stub();
    uxMock = stubInterface<UX>(sandbox, {
      table: tableStub,
      styledHeader: headerStub,
    });
  });

  afterEach(() => {
    sandbox.restore();
    process.exitCode = undefined;
  });

  describe('json', () => {
    it('returns expected json for success', () => {
      const formatter = new PushResultFormatter(logger, new UX(logger), {}, deployResultSuccess);
      expect(formatter.getJson().pushedSource).to.deep.equal([
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
        expect(formatter.getJson().pushedSource).to.deep.equal([]);
      });
      it('honors quiet flag for json successes', () => {
        const formatter = new PushResultFormatter(logger, new UX(logger), { quiet: true }, deployResultFailure);
        expect(formatter.getJson().pushedSource).to.have.length(1);
      });
    });
  });

  describe('human output', () => {
    it('returns expected output for success', () => {
      process.exitCode = 0;
      const formatter = new PushResultFormatter(logger, uxMock as UX, {}, deployResultSuccess);
      formatter.display();
      expect(headerStub.callCount, JSON.stringify(headerStub.args)).to.equal(1);
      expect(tableStub.callCount, JSON.stringify(tableStub.args)).to.equal(1);
    });
    describe('quiet', () => {
      it('does not display successes for quiet', () => {
        process.exitCode = 0;
        const formatter = new PushResultFormatter(logger, uxMock as UX, { quiet: true }, deployResultSuccess);
        formatter.display();
        expect(headerStub.callCount, JSON.stringify(headerStub.args)).to.equal(0);
        expect(formatter.getJson().pushedSource).to.deep.equal([]);
        expect(tableStub.callCount).to.equal(0);
      });
      it('displays errors and throws for quiet', () => {
        process.exitCode = 1;
        const formatter = new PushResultFormatter(logger, uxMock as UX, { quiet: true }, deployResultFailure);
        try {
          formatter.display();
          throw new Error('should have thrown');
        } catch (err) {
          expect(tableStub.callCount).to.equal(1);
        }
      });
    });
  });
});
