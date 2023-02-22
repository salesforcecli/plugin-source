/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import * as sinon from 'sinon';
import { expect } from 'chai';
import { DeployResult, FileResponse } from '@salesforce/source-deploy-retrieve';
import { stubInterface } from '@salesforce/ts-sinon';
import { Ux } from '@salesforce/sf-plugins-core';
import { getDeployResult } from '../commands/source/deployResponses';
import { DeployCommandResult, DeployResultFormatter } from '../../src/formatters/deployResultFormatter';

describe('DeployResultFormatter', () => {
  const sandbox = sinon.createSandbox();

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
      const deployResponse = JSON.parse(JSON.stringify(deployResultSuccess.response)) as DeployCommandResult;
      const expectedSuccessResults = deployResultSuccess.response as DeployCommandResult;
      const formatter = new DeployResultFormatter(ux as Ux, {}, deployResultSuccess);
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
      const formatter = new DeployResultFormatter(ux as Ux, {}, deployResultFailure);
      expect(formatter.getJson()).to.deep.equal(expectedFailureResults);
    });

    it('should return expected json for a partial success', () => {
      const deployResponse = JSON.parse(JSON.stringify(deployResultPartialSuccess.response)) as DeployCommandResult;
      const expectedPartialSuccessResponse = deployResultPartialSuccess.response as DeployCommandResult;
      expectedPartialSuccessResponse.deployedSource = deployResultPartialSuccess.getFileResponses();
      expectedPartialSuccessResponse.outboundFiles = [];
      expectedPartialSuccessResponse.deploys = [deployResponse];
      const formatter = new DeployResultFormatter(ux as Ux, {}, deployResultPartialSuccess);
      expect(formatter.getJson()).to.deep.equal(expectedPartialSuccessResponse);
    });

    describe('replacements', () => {
      it('includes expected json property when there are replacements', () => {
        const resultWithReplacements = {
          ...(JSON.parse(JSON.stringify(deployResultSuccess)) as DeployResult),
          replacements: new Map<string, string[]>([['MyApexClass.cls', ['foo', 'bar']]]),
        };
        const formatter = new DeployResultFormatter(ux as Ux, {}, resultWithReplacements as DeployResult);
        const json = formatter.getJson();

        expect(json.replacements).to.deep.equal({ 'MyApexClass.cls': ['foo', 'bar'] });
      });
      it('omits json property when there are no replacements', () => {
        const resultWithoutReplacements = {
          ...(JSON.parse(JSON.stringify(deployResultSuccess)) as DeployResult),
        };
        const formatter = new DeployResultFormatter(ux as Ux, {}, resultWithoutReplacements as DeployResult);
        const json = formatter.getJson();
        expect(json.replacements).to.be.undefined;
      });
      it('omits json property when replacements exists but is empty', () => {
        const resultWithEmptyReplacements = {
          ...(JSON.parse(JSON.stringify(deployResultSuccess)) as DeployResult),
          replacements: new Map<string, string[]>(),
        };
        const formatter = new DeployResultFormatter(ux as Ux, {}, resultWithEmptyReplacements as DeployResult);
        const json = formatter.getJson();
        expect(json.replacements).to.be.undefined;
      });
    });
  });

  describe('display', () => {
    it('should output as expected for a success', async () => {
      const formatter = new DeployResultFormatter(ux as Ux, {}, deployResultSuccess);
      formatter.display();
      expect(styledHeaderStub.calledOnce).to.equal(true);
      expect(logStub.callCount).to.equal(2);
      expect(tableStub.called).to.equal(true);
      expect(styledHeaderStub.firstCall.args[0]).to.contain('Deployed Source');
      const fileResponses = deployResultSuccess.getFileResponses();
      resolveExpectedPaths(fileResponses);
      expect(tableStub.firstCall.args[0]).to.deep.equal(fileResponses);
    });

    it('should output as expected for a failure and exclude duplicate information', async () => {
      const formatter = new DeployResultFormatter(ux as Ux, {}, deployResultFailure);
      formatter.display();
      expect(styledHeaderStub.calledOnce).to.equal(true);
      expect(logStub.callCount).to.equal(3);
      expect(tableStub.called).to.equal(true);
      expect(styledHeaderStub.args[0][0]).to.include('Component Failures [1]');
      const fileResponses = deployResultFailure.getFileResponses();
      resolveExpectedPaths(fileResponses);
      expect(tableStub.firstCall.args[0]).to.deep.equal(fileResponses);
    });

    it('should output as expected for a deploy failure (GACK)', async () => {
      const errorMessage =
        'UNKNOWN_EXCEPTION: An unexpected error occurred. Please include this ErrorId if you contact support: 1730955361-49792 (-1117026034)';
      const deployFailure = getDeployResult('failed', { errorMessage });
      deployFailure.response.details.componentFailures = [];
      deployFailure.response.details.componentSuccesses = [];
      delete deployFailure.response.details.runTestResult;
      const formatter = new DeployResultFormatter(ux as Ux, {}, deployFailure);
      sandbox.stub(formatter, 'isSuccess').returns(false);

      try {
        formatter.display();
        expect(false, 'should have thrown a DeployFailed error').to.be.true;
      } catch (err) {
        const error = err as Error;
        expect(error.message).to.equal(`Deploy failed. ${errorMessage}`);
        expect(styledHeaderStub.called).to.equal(false);
        expect(tableStub.called).to.equal(false);
      }
    });

    it('should output as expected for a test failure with verbose', async () => {
      const formatter = new DeployResultFormatter(ux as Ux, { verbose: true }, deployResultTestFailure);
      formatter.display();
      expect(styledHeaderStub.calledThrice).to.equal(true);
      expect(logStub.callCount).to.equal(8);
      expect(tableStub.calledThrice).to.equal(true);
      expect(styledHeaderStub.args[0][0]).to.include('Component Failures [1]');
      expect(styledHeaderStub.args[1][0]).to.include('Test Failures [1]');
      expect(styledHeaderStub.args[2][0]).to.include('Apex Code Coverage');
    });

    it('should output as expected for passing tests with verbose', async () => {
      const formatter = new DeployResultFormatter(ux as Ux, { verbose: true }, deployResultTestSuccess);
      formatter.display();
      expect(styledHeaderStub.calledThrice).to.equal(true);
      expect(logStub.callCount).to.equal(8);
      expect(tableStub.calledThrice).to.equal(true);
      expect(styledHeaderStub.args[0][0]).to.include('Component Failures [1]');
      expect(styledHeaderStub.args[1][0]).to.include('Test Success [1]');
      expect(styledHeaderStub.args[2][0]).to.include('Apex Code Coverage');
    });

    it('should output as expected for passing and failing tests with verbose', async () => {
      const formatter = new DeployResultFormatter(ux as Ux, { verbose: true }, deployResultTestSuccessAndFailure);
      formatter.display();
      expect(styledHeaderStub.callCount).to.equal(4);
      expect(logStub.callCount).to.equal(9);
      expect(tableStub.callCount).to.equal(4);
      expect(styledHeaderStub.args[0][0]).to.include('Component Failures [1]');
      expect(styledHeaderStub.args[1][0]).to.include('Test Failures [2]');
      expect(styledHeaderStub.args[2][0]).to.include('Test Success [1]');
      expect(styledHeaderStub.args[3][0]).to.include('Apex Code Coverage');
    });

    it('shows success AND failures for partialSucceeded', async () => {
      const formatter = new DeployResultFormatter(ux as Ux, { verbose: true }, deployResultPartialSuccess);
      formatter.display();
      expect(styledHeaderStub.callCount, 'styledHeaderStub.callCount').to.equal(2);
      expect(logStub.callCount, 'logStub.callCount').to.equal(4);
      expect(tableStub.callCount, 'tableStub.callCount').to.equal(2);
      expect(styledHeaderStub.args[0][0]).to.include('Deployed Source');
      expect(styledHeaderStub.args[1][0]).to.include('Component Failures');
    });

    describe('replacements', () => {
      it('omits replacements when there are none', async () => {
        process.exitCode = 0;
        const resultWithoutReplacements = {
          ...deployResultSuccess,
        } as DeployResult;
        const formatter = new DeployResultFormatter(ux as Ux, { verbose: true }, resultWithoutReplacements);

        formatter.display();

        expect(logStub.callCount, 'logStub.callCount').to.equal(2);
        expect(tableStub.callCount, 'tableStub.callCount').to.equal(1);
        expect(styledHeaderStub.args[0][0]).to.include('Deployed Source');
      });
      it('displays replacements on verbose', async () => {
        process.exitCode = 0;

        const resultWithReplacements = {
          ...deployResultSuccess,
          replacements: new Map<string, string[]>([['MyApexClass.cls', ['foo', 'bar']]]),
        } as DeployResult;
        const formatter = new DeployResultFormatter(ux as Ux, { verbose: true }, resultWithReplacements);
        formatter.display();

        expect(logStub.callCount, 'logStub.callCount').to.equal(3);
        // expect(tableStub.callCount, 'tableStub.callCount').to.equal(2);
        expect(styledHeaderStub.args[0][0]).to.include('Deployed Source');
        expect(styledHeaderStub.args[1][0]).to.include('Metadata Replacements');
      });
      it('omits replacements unless verbose', async () => {
        process.exitCode = 0;

        const resultWithReplacements = {
          ...deployResultSuccess,
          replacements: new Map<string, string[]>([['MyApexClass.cls', ['foo', 'bar']]]),
        } as DeployResult;
        const formatter = new DeployResultFormatter(ux as Ux, {}, resultWithReplacements);
        formatter.display();

        expect(logStub.callCount, 'logStub.callCount').to.equal(2);
        expect(tableStub.callCount, 'tableStub.callCount').to.equal(1);
        expect(styledHeaderStub.args[0][0]).to.include('Deployed Source');
      });
    });
  });
});
