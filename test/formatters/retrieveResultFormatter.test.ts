/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { join, relative } from 'node:path';
import sinon from 'sinon';
import { expect } from 'chai';
import { FileResponse } from '@salesforce/source-deploy-retrieve';
import { cloneJson, ensureArray } from '@salesforce/kit';
import { stubInterface } from '@salesforce/ts-sinon';
import { Ux } from '@salesforce/sf-plugins-core';
import { TestContext } from '@salesforce/core/lib/testSetup.js';
import { getRetrieveResult } from '../commands/source/retrieveResponses.js';
import { RetrieveCommandResult, RetrieveResultFormatter } from '../../src/formatters/retrieveResultFormatter.js';

describe('RetrieveResultFormatter', () => {
  const sandbox = new TestContext().SANDBOX;

  const retrieveResultSuccess = getRetrieveResult('success');
  const retrieveResultFailure = getRetrieveResult('failed');
  const retrieveResultInProgress = getRetrieveResult('inProgress');
  const retrieveResultEmpty = getRetrieveResult('empty');
  const retrieveResultWarnings = getRetrieveResult('warnings');

  let ux: Ux;
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
    // ux is a stubbed Ux
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    ux = stubInterface<Ux>(sandbox, {
      log: logStub,
      styledHeader: styledHeaderStub,
      table: tableStub,
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('getJson', () => {
    it('should return expected json for a success', () => {
      const expectedSuccessResults: RetrieveCommandResult = {
        inboundFiles: retrieveResultSuccess.getFileResponses(),
        packages: [],
        warnings: [],
        response: cloneJson(retrieveResultSuccess.response),
      };
      const formatter = new RetrieveResultFormatter(ux, {}, retrieveResultSuccess);
      expect(formatter.getJson()).to.deep.equal(expectedSuccessResults);
    });

    it('should return expected json for a failure', () => {
      const expectedFailureResults: RetrieveCommandResult = {
        inboundFiles: retrieveResultSuccess.getFileResponses(),
        packages: [],
        warnings: [],
        response: cloneJson(retrieveResultFailure.response),
      };
      const formatter = new RetrieveResultFormatter(ux, {}, retrieveResultFailure);
      expect(formatter.getJson()).to.deep.equal(expectedFailureResults);
    });

    it('should return expected json for an InProgress', () => {
      const expectedInProgressResults: RetrieveCommandResult = {
        inboundFiles: retrieveResultSuccess.getFileResponses(),
        packages: [],
        warnings: [],
        response: cloneJson(retrieveResultInProgress.response),
      };
      const formatter = new RetrieveResultFormatter(ux, {}, retrieveResultInProgress);
      expect(formatter.getJson()).to.deep.equal(expectedInProgressResults);
    });

    it('should return expected json for a success with packages', () => {
      const testPkg = { name: 'testPkg', path: join('path', 'to', 'testPkg') };
      const expectedSuccessResults: RetrieveCommandResult = {
        inboundFiles: retrieveResultSuccess.getFileResponses(),
        packages: [testPkg],
        warnings: [],
        response: cloneJson(retrieveResultSuccess.response),
      };
      const formatter = new RetrieveResultFormatter(ux, { packages: [testPkg] }, retrieveResultSuccess);
      expect(formatter.getJson()).to.deep.equal(expectedSuccessResults);
    });

    it('should return expected json for a success with warnings', () => {
      const warnMessages = retrieveResultWarnings.response.messages;
      const warnings = ensureArray(warnMessages);
      const expectedSuccessResults: RetrieveCommandResult = {
        inboundFiles: retrieveResultWarnings.getFileResponses(),
        packages: [],
        warnings,
        response: cloneJson(retrieveResultWarnings.response),
      };
      const formatter = new RetrieveResultFormatter(ux, {}, retrieveResultWarnings);
      expect(formatter.getJson()).to.deep.equal(expectedSuccessResults);
    });
  });

  describe('display', () => {
    it('should output as expected for a success', () => {
      const formatter = new RetrieveResultFormatter(ux, {}, retrieveResultSuccess);
      formatter.display();
      expect(styledHeaderStub.called).to.equal(true);
      expect(logStub.called).to.equal(false);
      expect(tableStub.called).to.equal(true);
      expect(styledHeaderStub.firstCall.args[0]).to.contain('Retrieved Source');
      const fileResponses = retrieveResultSuccess.getFileResponses();
      resolveExpectedPaths(fileResponses);
      expect(tableStub.firstCall.args[0]).to.deep.equal(fileResponses);
    });

    it('should output as expected for an InProgress', () => {
      const options = { waitTime: 33 };
      const formatter = new RetrieveResultFormatter(ux, options, retrieveResultInProgress);
      formatter.display();
      expect(styledHeaderStub.called).to.equal(false);
      expect(logStub.called).to.equal(true);
      expect(tableStub.called).to.equal(false);
      expect(logStub.firstCall.args[0])
        .to.contain('Your retrieve request did not complete')
        .and.contain(`${options.waitTime} minutes`);
    });

    it('should output as expected for a Failure', () => {
      const formatter = new RetrieveResultFormatter(ux, {}, retrieveResultFailure);
      sandbox.stub(formatter, 'isSuccess').returns(false);

      formatter.display();
      expect(logStub.called).to.equal(true);
      expect(tableStub.called).to.equal(false);
      expect(logStub.firstCall.args[0]).to.contain('Retrieve Failed due to:');
    });

    it('should output as expected for warnings', () => {
      const formatter = new RetrieveResultFormatter(ux, {}, retrieveResultWarnings);
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

    it('should output a message when no results were returned', () => {
      const formatter = new RetrieveResultFormatter(ux, {}, retrieveResultEmpty);
      formatter.display();
      expect(styledHeaderStub.called).to.equal(true);
      expect(logStub.called).to.equal(true);
      expect(tableStub.called).to.equal(false);
      expect(styledHeaderStub.firstCall.args[0]).to.contain('Retrieved Source');
      expect(logStub.firstCall.args[0]).to.contain('No results found');
    });
  });
});
