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
import { MdDeployResultFormatter } from '../../src/formatters/mdapi/mdDeployResultFormatter';

describe('mdDeployResultFormatter', () => {
  const sandbox = sinon.createSandbox();

  const deployResultSuccess = getDeployResult('successSync');
  const deployResultFailure = getDeployResult('failed');
  const deployResultPartialSuccess = getDeployResult('partialSuccessSync');
  const deployResultTestFailure = getDeployResult('failedTest');
  const deployResultTestSuccess = getDeployResult('passedTest');
  const deployResultTestSuccessAndFailure = getDeployResult('passedAndFailedTest');

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
    // formatter relies on the exit code having already been set during the command
    process.exitCode = undefined;
  });

  describe('getJson', () => {
    it('should return expected json for a success', async () => {
      process.exitCode = 0;
      const expectedSuccessResults = deployResultSuccess.response;
      const formatter = new MdDeployResultFormatter(logger, ux as UX, {}, deployResultSuccess);
      const json = formatter.getJson();

      expect(json).to.deep.equal(expectedSuccessResults);
    });

    it('should return expected json for a failure', async () => {
      process.exitCode = 1;

      const expectedFailureResults = deployResultFailure.response;
      const formatter = new MdDeployResultFormatter(logger, ux as UX, {}, deployResultFailure);
      expect(formatter.getJson()).to.deep.equal(expectedFailureResults);
    });

    it('should return expected json for a partial success', () => {
      process.exitCode = 69;
      const expectedPartialSuccessResponse = deployResultPartialSuccess.response;
      const formatter = new MdDeployResultFormatter(logger, ux as UX, {}, deployResultPartialSuccess);
      expect(formatter.getJson()).to.deep.equal(expectedPartialSuccessResponse);
    });

    it('should omit successes when used with concise', () => {
      process.exitCode = 0;
      const expectedSuccessResults = deployResultSuccess.response;

      const formatter = new MdDeployResultFormatter(logger, ux as UX, {}, deployResultSuccess);
      const json = formatter.getJson();

      // a few checks that it's the rest of the json
      expect(json.status).to.equal(expectedSuccessResults.status);
      expect(json.numberComponentsDeployed).to.equal(expectedSuccessResults.numberComponentsDeployed);
      // except the status
      expect(json.details.componentSuccesses).to.be.undefined;
    });
  });

  describe('display', () => {
    it('should output as expected for a success (no table)', async () => {
      process.exitCode = 0;
      const formatter = new MdDeployResultFormatter(logger, ux as UX, {}, deployResultSuccess);
      formatter.display();
      expect(logStub.callCount).to.equal(0);
      expect(tableStub.callCount).to.equal(0);
      expect(styledHeaderStub.callCount).to.equal(0);
    });

    it('should output as expected for a verbose success (has table)', async () => {
      const formatter = new MdDeployResultFormatter(logger, ux as UX, { verbose: true }, deployResultSuccess);
      process.exitCode = 0;
      formatter.display();
      expect(styledHeaderStub.callCount).to.equal(1);
      expect(logStub.callCount).to.equal(1);
      expect(tableStub.callCount).to.equal(1);
      expect(styledHeaderStub.firstCall.args[0]).to.contain('Deployed Source');
      expect(tableStub.firstCall.args[0]).to.have.length(2);
    });

    it('should output as expected for a failure and exclude duplicate information', async () => {
      process.exitCode = 1;
      const formatter = new MdDeployResultFormatter(logger, ux as UX, {}, deployResultFailure);

      try {
        formatter.display();
        throw new Error('should have thrown');
      } catch (err) {
        expect(styledHeaderStub.callCount).to.equal(1);
        expect(logStub.callCount).to.equal(2);
        expect(tableStub.callCount).to.equal(1);
        expect(styledHeaderStub.args[0][0]).to.include('Component Failures [1]');
      }
    });

    it('should output as expected for a test failure with verbose', async () => {
      process.exitCode = 1;
      const formatter = new MdDeployResultFormatter(logger, ux as UX, { verbose: true }, deployResultTestFailure);
      try {
        formatter.display();
        throw new Error('should have thrown');
      } catch (err) {
        expect(tableStub.callCount).to.equal(3);
        expect(styledHeaderStub.callCount, JSON.stringify(styledHeaderStub.args)).to.equal(3);
        expect(logStub.callCount).to.equal(7);
        expect(tableStub.callCount).to.equal(3);
        expect(styledHeaderStub.args[0][0]).to.include('Component Failures [1]');
        expect(styledHeaderStub.args[1][0]).to.include('Test Failures [1]');
        expect(styledHeaderStub.args[2][0]).to.include('Apex Code Coverage');
      }
    });

    it('should output as expected for passing tests with verbose', async () => {
      process.exitCode = 0;
      const formatter = new MdDeployResultFormatter(logger, ux as UX, { verbose: true }, deployResultTestSuccess);
      formatter.display();
      expect(styledHeaderStub.args[0][0]).to.include('Deployed Source');
      expect(styledHeaderStub.args[1][0]).to.include('Component Failures [1]');
      expect(styledHeaderStub.args[2][0]).to.include('Test Success [1]');
      expect(styledHeaderStub.args[3][0]).to.include('Apex Code Coverage');
    });

    it('should output as expected for passing and failing tests with verbose', async () => {
      process.exitCode = 1;
      const formatter = new MdDeployResultFormatter(
        logger,
        ux as UX,
        { verbose: true },
        deployResultTestSuccessAndFailure
      );
      try {
        formatter.display();
        throw new Error('should have thrown');
      } catch (err) {
        expect(styledHeaderStub.callCount).to.equal(4);
        expect(logStub.callCount).to.equal(8);
        expect(tableStub.callCount).to.equal(4);
        expect(styledHeaderStub.args[0][0]).to.include('Component Failures [1]');
        expect(styledHeaderStub.args[1][0]).to.include('Test Failures [2]');
        expect(styledHeaderStub.args[2][0]).to.include('Test Success [1]');
        expect(styledHeaderStub.args[3][0]).to.include('Apex Code Coverage');
      }
    });

    it('shows success AND failures for partialSucceeded', async () => {
      process.exitCode = 69;
      const formatter = new MdDeployResultFormatter(logger, ux as UX, { verbose: true }, deployResultPartialSuccess);
      formatter.display();
      expect(styledHeaderStub.callCount, 'styledHeaderStub.callCount').to.equal(2);
      expect(logStub.callCount, 'logStub.callCount').to.equal(3);
      expect(tableStub.callCount, 'tableStub.callCount').to.equal(2);
      expect(styledHeaderStub.args[0][0]).to.include('Deployed Source');
      expect(styledHeaderStub.args[1][0]).to.include('Component Failures');
    });
  });
});
