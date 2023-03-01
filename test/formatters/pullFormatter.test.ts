/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { relative } from 'path';
import * as sinon from 'sinon';
import { expect } from 'chai';
import { FileResponse } from '@salesforce/source-deploy-retrieve';
import { stubInterface } from '@salesforce/ts-sinon';
import { ensureArray } from '@salesforce/kit';
import { Ux } from '@salesforce/sf-plugins-core';
import { TestContext } from '@salesforce/core/lib/testSetup';
import { getRetrieveResult } from '../commands/source/retrieveResponses';
import { PullResponse, PullResultFormatter } from '../../src/formatters/source/pullFormatter';

describe('PullFormatter', () => {
  const sandbox = new TestContext().SANDBOX;

  const retrieveResultSuccess = getRetrieveResult('success');
  const retrieveResultFailure = getRetrieveResult('failed');
  const retrieveResultInProgress = getRetrieveResult('inProgress');
  const retrieveResultEmpty = getRetrieveResult('empty');
  const retrieveResultWarnings = getRetrieveResult('warnings');

  let ux;
  let logStub: sinon.SinonStub;
  let styledHeaderStub: sinon.SinonStub;
  let tableStub: sinon.SinonStub;

  const resolveExpectedPaths = (fileResponses: FileResponse[]): void => {
    fileResponses.forEach((file) => {
      if (file.filePath) {
        file.filePath = relative(process.cwd(), file.filePath);
      }
    });
  };

  beforeEach(() => {
    logStub = sandbox.stub();
    styledHeaderStub = sandbox.stub();
    tableStub = sandbox.stub();
    ux = stubInterface<Ux>(sandbox, {
      log: logStub,
      styledHeader: styledHeaderStub,
      table: tableStub,
    });
  });

  afterEach(() => {
    sandbox.restore();
    process.exitCode = undefined;
  });

  describe('getJson', () => {
    it('should return expected json for a success', async () => {
      process.exitCode = 0;
      const expectedSuccessResults: PullResponse['pulledSource'] = retrieveResultSuccess.getFileResponses();
      const formatter = new PullResultFormatter(ux as Ux, {}, retrieveResultSuccess);
      expect(formatter.getJson().pulledSource).to.deep.equal(expectedSuccessResults);
    });

    it('should return expected json for a failure', async () => {
      process.exitCode = 1;
      const expectedFailureResults: PullResponse['pulledSource'] = retrieveResultFailure.getFileResponses();
      const formatter = new PullResultFormatter(ux as Ux, {}, retrieveResultFailure);
      try {
        formatter.getJson().pulledSource;
        throw new Error('should have thrown');
      } catch (error) {
        expect(error).to.have.property('message', 'Pull failed.');
        expect(error).to.have.property('data').deep.equal(expectedFailureResults);
        expect(error).to.have.property('stack').includes('PullFailed:');
        expect(error).to.have.property('name', 'PullFailed');
      }
    });

    it('should return expected json for an InProgress', async () => {
      const expectedInProgressResults: PullResponse['pulledSource'] = retrieveResultInProgress.getFileResponses();
      const formatter = new PullResultFormatter(ux as Ux, {}, retrieveResultInProgress);
      expect(formatter.getJson().pulledSource).to.deep.equal(expectedInProgressResults);
    });

    describe('display', () => {
      it('should output as expected for a success', async () => {
        process.exitCode = 0;
        const formatter = new PullResultFormatter(ux as Ux, {}, retrieveResultSuccess);
        formatter.display();
        expect(styledHeaderStub.called).to.equal(true);
        expect(logStub.called).to.equal(false);
        expect(tableStub.called).to.equal(true);
        expect(styledHeaderStub.firstCall.args[0]).to.contain('Retrieved Source');
        const fileResponses = retrieveResultSuccess.getFileResponses();
        resolveExpectedPaths(fileResponses);
        expect(tableStub.firstCall.args[0]).to.deep.equal(fileResponses);
      });

      it('should output as expected for an InProgress', async () => {
        process.exitCode = 68;
        const options = { waitTime: 33 };
        const formatter = new PullResultFormatter(ux as Ux, options, retrieveResultInProgress);
        formatter.display();
        expect(styledHeaderStub.called).to.equal(false);
        expect(logStub.called).to.equal(true);
        expect(tableStub.called).to.equal(false);
        expect(logStub.firstCall.args[0])
          .to.contain('Your retrieve request did not complete')
          .and.contain(`${options.waitTime} minutes`);
      });

      it('should output as expected for a Failure', async () => {
        process.exitCode = 1;
        const formatter = new PullResultFormatter(ux as Ux, {}, retrieveResultFailure);
        sandbox.stub(formatter, 'isSuccess').returns(false);

        formatter.display();
        expect(logStub.called).to.equal(true);
        expect(tableStub.called).to.equal(false);
        expect(logStub.firstCall.args[0]).to.contain('Retrieve Failed due to:');
      });

      it('should output as expected for warnings', async () => {
        process.exitCode = 0;
        const formatter = new PullResultFormatter(ux as Ux, {}, retrieveResultWarnings);
        formatter.display();
        // Should call styledHeader for warnings and the standard "Retrieved Source" header
        expect(styledHeaderStub.calledTwice).to.equal(true);
        expect(logStub.called).to.equal(true);
        expect(tableStub.calledOnce).to.equal(true);
        expect(styledHeaderStub.secondCall.args[0]).to.contain('Retrieved Source Warnings');
        const warnMessages = retrieveResultWarnings.response.messages;
        const warnings = ensureArray(warnMessages);
        expect(tableStub.firstCall.args[0]).to.deep.equal(warnings);
      });

      it('should output a message when no results were returned', async () => {
        process.exitCode = 0;
        const formatter = new PullResultFormatter(ux as Ux, {}, retrieveResultEmpty);
        formatter.display();
        expect(styledHeaderStub.called).to.equal(true);
        expect(logStub.called).to.equal(true);
        expect(tableStub.called).to.equal(false);
        expect(styledHeaderStub.firstCall.args[0]).to.contain('Retrieved Source');
        expect(logStub.firstCall.args[0]).to.contain('No results found');
      });
    });
  });
});
