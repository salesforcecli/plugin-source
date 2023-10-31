/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import sinon from 'sinon';
import { expect } from 'chai';
import { stubInterface } from '@salesforce/ts-sinon';
import { Ux } from '@salesforce/sf-plugins-core';
import { TestContext } from '@salesforce/core/lib/testSetup.js';
import { getDeployResult } from '../commands/source/deployResponses.js';
import { MdDeployResultFormatter } from '../../src/formatters/mdapi/mdDeployResultFormatter.js';

describe('mdDeployResultFormatter', () => {
  const sandbox = new TestContext().SANDBOX;

  const deployResultSuccess = getDeployResult('successSync');
  const deployResultFailure = getDeployResult('failed');
  const deployResultPartialSuccess = getDeployResult('partialSuccessSync');
  const deployResultTestFailure = getDeployResult('failedTest');
  const deployResultTestSuccess = getDeployResult('passedTest');
  const deployResultTestSuccessAndFailure = getDeployResult('passedAndFailedTest');

  let ux;

  let logStub: sinon.SinonStub;
  let styledHeaderStub: sinon.SinonStub;
  let tableStub: sinon.SinonStub;

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
    // formatter relies on the exit code having already been set during the command
    process.exitCode = undefined;
  });

  describe('getJson', () => {
    it('should return expected json for a success', () => {
      process.exitCode = 0;
      const expectedSuccessResults = deployResultSuccess.response;
      const formatter = new MdDeployResultFormatter(ux as Ux, {}, deployResultSuccess);
      const json = formatter.getJson();

      expect(json).to.deep.equal(expectedSuccessResults);
    });

    it('should return expected json for a failure', () => {
      process.exitCode = 1;

      const expectedFailureResults = deployResultFailure.response;
      const formatter = new MdDeployResultFormatter(ux as Ux, {}, deployResultFailure);
      expect(formatter.getJson()).to.deep.equal(expectedFailureResults);
    });

    it('should return expected json for a partial success', () => {
      process.exitCode = 69;
      const expectedPartialSuccessResponse = deployResultPartialSuccess.response;
      const formatter = new MdDeployResultFormatter(ux as Ux, {}, deployResultPartialSuccess);
      expect(formatter.getJson()).to.deep.equal(expectedPartialSuccessResponse);
    });

    it('should omit successes when used with concise', () => {
      process.exitCode = 0;
      const expectedSuccessResults = deployResultSuccess.response;

      const formatter = new MdDeployResultFormatter(ux as Ux, { concise: true }, deployResultSuccess);
      const json = formatter.getJson();

      // a few checks that it's the rest of the json
      expect(json.status).to.equal(expectedSuccessResults.status);
      expect(json.numberComponentsDeployed).to.equal(expectedSuccessResults.numberComponentsDeployed);
      // except the status
      expect(json.details.componentSuccesses).to.be.undefined;
    });
  });

  describe('display', () => {
    it('should output as expected for a success (no table)', () => {
      process.exitCode = 0;
      const formatter = new MdDeployResultFormatter(ux as Ux, {}, deployResultSuccess);
      formatter.display();
      expect(logStub.callCount).to.equal(0);
      expect(tableStub.callCount).to.equal(0);
      expect(styledHeaderStub.callCount).to.equal(0);
    });

    it('should output as expected for a verbose success (has table)', () => {
      process.exitCode = 0;
      const formatter = new MdDeployResultFormatter(ux as Ux, { verbose: true }, deployResultSuccess);
      formatter.display();
      expect(styledHeaderStub.callCount).to.equal(1);
      expect(logStub.callCount).to.equal(1);
      expect(tableStub.callCount).to.equal(1);
      expect(styledHeaderStub.firstCall.args[0]).to.contain('Deployed Source');
      expect(tableStub.firstCall.args[0]).to.have.length(2);
    });

    it('should output as expected for a failure and exclude duplicate information', () => {
      process.exitCode = 1;
      const formatter = new MdDeployResultFormatter(ux as Ux, {}, deployResultFailure);

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

    it('should output as expected for a deploy failure (GACK)', () => {
      const errorMessage =
        'UNKNOWN_EXCEPTION: An unexpected error occurred. Please include this ErrorId if you contact support: 1730955361-49792 (-1117026034)';
      const deployFailure = getDeployResult('failed', { errorMessage });
      deployFailure.response.details.componentFailures = [];
      deployFailure.response.details.componentSuccesses = [];
      delete deployFailure.response.details.runTestResult;
      const formatter = new MdDeployResultFormatter(ux as Ux, {}, deployFailure);
      sandbox.stub(formatter, 'isSuccess').returns(false);

      try {
        formatter.display();
        expect(false, 'should have thrown a DeployFailed error').to.be.true;
      } catch (err) {
        const error = err as Error;
        expect(error.message).to.equal(`The metadata deploy operation failed. ${errorMessage}`);
        expect(styledHeaderStub.called).to.equal(false);
        expect(tableStub.called).to.equal(false);
      }
    });

    it('should output as expected for a test failure with verbose', () => {
      process.exitCode = 1;
      const formatter = new MdDeployResultFormatter(ux as Ux, { verbose: true }, deployResultTestFailure);
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

    it('should output as expected for passing tests with verbose', () => {
      process.exitCode = 0;
      const formatter = new MdDeployResultFormatter(ux as Ux, { verbose: true }, deployResultTestSuccess);
      formatter.display();
      expect(styledHeaderStub.args[0][0]).to.include('Deployed Source');
      expect(styledHeaderStub.args[1][0]).to.include('Component Failures [1]');
      expect(styledHeaderStub.args[2][0]).to.include('Test Success [1]');
      expect(styledHeaderStub.args[3][0]).to.include('Apex Code Coverage');
    });

    it('should output as expected for passing and failing tests with verbose', () => {
      process.exitCode = 1;
      const formatter = new MdDeployResultFormatter(ux as Ux, { verbose: true }, deployResultTestSuccessAndFailure);
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

    it('shows success AND failures for partialSucceeded', () => {
      process.exitCode = 69;
      const formatter = new MdDeployResultFormatter(ux as Ux, { verbose: true }, deployResultPartialSuccess);
      formatter.display();
      expect(styledHeaderStub.callCount, 'styledHeaderStub.callCount').to.equal(2);
      expect(logStub.callCount, 'logStub.callCount').to.equal(3);
      expect(tableStub.callCount, 'tableStub.callCount').to.equal(2);
      expect(styledHeaderStub.args[0][0]).to.include('Deployed Source');
      expect(styledHeaderStub.args[1][0]).to.include('Component Failures');
    });
  });
});
