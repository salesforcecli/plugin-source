/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as sinon from 'sinon';
import { expect } from 'chai';
import { Logger } from '@salesforce/core';
import { UX } from '@salesforce/command';
import { cloneJson } from '@salesforce/kit';
import { stubInterface } from '@salesforce/ts-sinon';
import { getRetrieveResult } from '../commands/source/retrieveResponses';
import { RetrieveCommandResult, RetrieveResultFormatter } from '../../src/formatters/retrieveResultFormatter';

describe('RetrieveResultFormatter', () => {
  const sandbox = sinon.createSandbox();

  const retrieveResultSuccess = getRetrieveResult('success');
  const retrieveResultFailure = getRetrieveResult('failed');
  const retrieveResultInProgress = getRetrieveResult('inProgress');
  const retrieveResultEmpty = getRetrieveResult('empty');

  const logger = Logger.childFromRoot('retrieveTestLogger').useMemoryLogging();
  let ux;
  let logStub: sinon.SinonStub;
  let styledHeaderStub: sinon.SinonStub;
  let tableStub: sinon.SinonStub;

  beforeEach(() => {
    logStub = sandbox.stub();
    styledHeaderStub = sandbox.stub();
    tableStub = sandbox.stub();
    ux = stubInterface<UX>(sandbox, {
      log: logStub,
      styledHeader: styledHeaderStub,
      table: tableStub,
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('getJson', () => {
    it('should return expected json for a success', async () => {
      const expectedSuccessResults: RetrieveCommandResult = {
        inboundFiles: retrieveResultSuccess.getFileResponses(),
        packages: [],
        warnings: [],
        response: cloneJson(retrieveResultSuccess.response),
      };
      const formatter = new RetrieveResultFormatter(logger, ux, {}, retrieveResultSuccess);
      expect(formatter.getJson()).to.deep.equal(expectedSuccessResults);
    });

    it('should return expected json for a failure', async () => {
      const expectedFailureResults: RetrieveCommandResult = {
        inboundFiles: retrieveResultSuccess.getFileResponses(),
        packages: [],
        warnings: [],
        response: cloneJson(retrieveResultFailure.response),
      };
      const formatter = new RetrieveResultFormatter(logger, ux, {}, retrieveResultFailure);
      expect(formatter.getJson()).to.deep.equal(expectedFailureResults);
    });

    it('should return expected json for an InProgress', async () => {
      const expectedInProgressResults: RetrieveCommandResult = {
        inboundFiles: retrieveResultSuccess.getFileResponses(),
        packages: [],
        warnings: [],
        response: cloneJson(retrieveResultInProgress.response),
      };
      const formatter = new RetrieveResultFormatter(logger, ux, {}, retrieveResultInProgress);
      expect(formatter.getJson()).to.deep.equal(expectedInProgressResults);
    });

    it.skip('should return expected json for a success with packages', async () => {
      const expectedSuccessResults: RetrieveCommandResult = {
        inboundFiles: retrieveResultSuccess.getFileResponses(),
        packages: [],
        warnings: [],
        response: cloneJson(retrieveResultSuccess.response),
      };
      const formatter = new RetrieveResultFormatter(logger, ux, {}, retrieveResultSuccess);
      expect(formatter.getJson()).to.deep.equal(expectedSuccessResults);
    });

    it.skip('should return expected json for a success with warnings', async () => {
      const expectedSuccessResults: RetrieveCommandResult = {
        inboundFiles: retrieveResultSuccess.getFileResponses(),
        packages: [],
        warnings: [],
        response: cloneJson(retrieveResultSuccess.response),
      };
      const formatter = new RetrieveResultFormatter(logger, ux, {}, retrieveResultSuccess);
      expect(formatter.getJson()).to.deep.equal(expectedSuccessResults);
    });
  });

  describe('display', () => {
    it('should output as expected for a success', async () => {
      const formatter = new RetrieveResultFormatter(logger, ux, {}, retrieveResultSuccess);
      formatter.display();
      expect(styledHeaderStub.called).to.equal(true);
      expect(logStub.called).to.equal(false);
      expect(tableStub.called).to.equal(true);
      expect(styledHeaderStub.firstCall.args[0]).to.contain('Retrieved Source');
      // NOTE: THIS SHOULD CHANGE TO BE THE fileResponses after the async PR is merged.
      const fileProps = retrieveResultSuccess.response.fileProperties;
      expect(tableStub.firstCall.args[0]).to.deep.equal(fileProps);
    });

    it('should output as expected for an InProgress', async () => {
      const options = { waitTime: 33 };
      const formatter = new RetrieveResultFormatter(logger, ux, options, retrieveResultInProgress);
      formatter.display();
      expect(styledHeaderStub.called).to.equal(false);
      expect(logStub.called).to.equal(true);
      expect(tableStub.called).to.equal(false);
      expect(logStub.firstCall.args[0])
        .to.contain('Your retrieve request did not complete')
        .and.contain(`${options.waitTime} minutes`);
    });

    it.skip('should output as expected for a Failure', async () => {
      const formatter = new RetrieveResultFormatter(logger, ux, {}, retrieveResultInProgress);
      formatter.display();
      expect(styledHeaderStub.called).to.equal(true);
      expect(logStub.called).to.equal(true);
      expect(tableStub.called).to.equal(false);
      expect(logStub.firstCall.args[0]).to.contain('Retrieve Failed due to:');
    });

    it('should output a message when no results were returned', async () => {
      const formatter = new RetrieveResultFormatter(logger, ux, {}, retrieveResultEmpty);
      formatter.display();
      expect(styledHeaderStub.called).to.equal(true);
      expect(logStub.called).to.equal(true);
      expect(tableStub.called).to.equal(false);
      expect(styledHeaderStub.firstCall.args[0]).to.contain('Retrieved Source');
      expect(logStub.firstCall.args[0]).to.contain('No results found');
    });
  });
});
