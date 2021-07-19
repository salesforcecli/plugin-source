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
import { stubInterface } from '@salesforce/ts-sinon';
import { getDeployResult } from '../commands/source/deployResponses';
import { DeployCommandResult, DeployResultFormatter } from '../../src/formatters/deployResultFormatter';

describe('DeployResultFormatter', () => {
  const sandbox = sinon.createSandbox();

  const deployResultSuccess = getDeployResult('successSync');
  const deployResultFailure = getDeployResult('failed');

  const logger = Logger.childFromRoot('deployTestLogger').useMemoryLogging();
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
      expect(tableStub.firstCall.args[0]).to.deep.equal(fileResponses);
    });
  });
});
