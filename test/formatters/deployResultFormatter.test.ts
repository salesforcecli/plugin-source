/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import * as sinon from 'sinon';
import { expect } from 'chai';
import { Logger } from '@salesforce/core';
import { UX } from '@salesforce/command';
import { FileResponse } from '@salesforce/source-deploy-retrieve';
import { stubInterface } from '@salesforce/ts-sinon';
import { getDeployResult } from '../commands/source/deployResponses';
import { DeployCommandResult, DeployResultFormatter } from '../../src/formatters/deployResultFormatter';

describe('DeployResultFormatter', () => {
  const sandbox = sinon.createSandbox();

  const deployResultSuccess = getDeployResult('successSync');
  const deployResultFailure = getDeployResult('failed');
  const deployResultTestFailure = getDeployResult('failedTest');
  const deployResultTestSuccess = getDeployResult('passedTest');
  const deployResultTestSuccessAndFailure = getDeployResult('passedAndFailedTest');

  const logger = Logger.childFromRoot('deployTestLogger').useMemoryLogging();
  let ux;
  let logStub: sinon.SinonStub;
  let styledHeaderStub: sinon.SinonStub;
  let tableStub: sinon.SinonStub;

  const resolveExpectedPaths = (fileResponses: FileResponse[]): void => {
    fileResponses.forEach((file) => {
      if (file.filePath) {
        file.filePath = path.relative(process.cwd(), file.filePath);
      }
    });
  };

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
      const deployResponse = JSON.parse(JSON.stringify(deployResultSuccess.response)) as DeployCommandResult;
      const expectedSuccessResults = deployResultSuccess.response as DeployCommandResult;
      const formatter = new DeployResultFormatter(logger, ux, {}, deployResultSuccess);
      const json = formatter.getJson();

      expectedSuccessResults.deployedSource = deployResultSuccess.getFileResponses();
      expectedSuccessResults.outboundFiles = [];
      expectedSuccessResults.deploys = [deployResponse];
      expect(json).to.deep.equal(expectedSuccessResults);
    });

    it('should return expected json for a failure', async () => {
      const deployResponse = JSON.parse(JSON.stringify(deployResultFailure.response)) as DeployCommandResult;
      const expectedFailureResults = deployResultFailure.response as DeployCommandResult;
      expectedFailureResults.deployedSource = deployResultFailure.getFileResponses();
      expectedFailureResults.outboundFiles = [];
      expectedFailureResults.deploys = [deployResponse];
      const formatter = new DeployResultFormatter(logger, ux, {}, deployResultFailure);
      expect(formatter.getJson()).to.deep.equal(expectedFailureResults);
    });
  });

  describe('display', () => {
    it('should output as expected for a success', async () => {
      const formatter = new DeployResultFormatter(logger, ux, {}, deployResultSuccess);
      formatter.display();
      expect(styledHeaderStub.calledOnce).to.equal(true);
      expect(logStub.calledOnce).to.equal(true);
      expect(tableStub.called).to.equal(true);
      expect(styledHeaderStub.firstCall.args[0]).to.contain('Deployed Source');
      const fileResponses = deployResultSuccess.getFileResponses();
      resolveExpectedPaths(fileResponses);
      expect(tableStub.firstCall.args[0]).to.deep.equal(fileResponses);
    });

    it('should output as expected for a failure', async () => {
      const formatter = new DeployResultFormatter(logger, ux, {}, deployResultFailure);
      formatter.display();
      expect(styledHeaderStub.calledOnce).to.equal(true);
      expect(logStub.calledTwice).to.equal(true);
      expect(tableStub.called).to.equal(true);
      expect(styledHeaderStub.firstCall.args[0]).to.contain('Component Failures [1]');
      const fileResponses = deployResultFailure.getFileResponses();
      resolveExpectedPaths(fileResponses);
      expect(tableStub.firstCall.args[0]).to.deep.equal(fileResponses);
    });

    it('should output as expected for a test failure with verbose', async () => {
      const formatter = new DeployResultFormatter(logger, ux, { verbose: true }, deployResultTestFailure);
      formatter.display();
      expect(styledHeaderStub.calledTwice).to.equal(true);
      expect(logStub.callCount).to.equal(5);
      expect(tableStub.calledTwice).to.equal(true);
      expect(styledHeaderStub.firstCall.args[0]).to.contain('Test Failures [1]');
      expect(styledHeaderStub.secondCall.args[0]).to.contain('Apex Code Coverage');
    });

    it('should output as expected for passing tests with verbose', async () => {
      const formatter = new DeployResultFormatter(logger, ux, { verbose: true }, deployResultTestSuccess);
      formatter.display();
      expect(styledHeaderStub.calledTwice).to.equal(true);
      expect(logStub.callCount).to.equal(5);
      expect(tableStub.calledTwice).to.equal(true);
      expect(styledHeaderStub.firstCall.args[0]).to.contain('Test Success [1]');
      expect(styledHeaderStub.secondCall.args[0]).to.contain('Apex Code Coverage');
    });

    it('should output as expected for passing and failing tests with verbose', async () => {
      const formatter = new DeployResultFormatter(logger, ux, { verbose: true }, deployResultTestSuccessAndFailure);
      formatter.display();
      expect(styledHeaderStub.callCount).to.equal(3);
      expect(logStub.callCount).to.equal(6);
      expect(tableStub.callCount).to.equal(3);
      expect(styledHeaderStub.firstCall.args[0]).to.contain('Test Failures [2]');
      expect(styledHeaderStub.secondCall.args[0]).to.contain('Test Success [1]');
      expect(styledHeaderStub.thirdCall.args[0]).to.contain('Apex Code Coverage');
    });
  });
});
