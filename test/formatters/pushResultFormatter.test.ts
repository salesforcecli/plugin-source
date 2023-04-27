/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { expect } from 'chai';
import * as sinon from 'sinon';
import { stubInterface } from '@salesforce/ts-sinon';
import { DeployResult } from '@salesforce/source-deploy-retrieve';
import { Ux } from '@salesforce/sf-plugins-core';
import { TestContext } from '@salesforce/core/lib/testSetup';
import { getDeployResult } from '../commands/source/deployResponses';
import { PushResultFormatter, mergeReplacements } from '../../src/formatters/source/pushResultFormatter';

describe('PushResultFormatter', () => {
  const deployResultSuccess = [getDeployResult('successSync')];
  const deployResultSuccessWithReplacements = [
    { ...getDeployResult('successSync'), replacements: new Map<string, string[]>([['foo', ['bar', 'baz']]]) },
  ] as DeployResult[];
  const deployResultFailure = [getDeployResult('failed')];

  const sandbox = new TestContext().SANDBOX;

  let uxMock;
  let tableStub: sinon.SinonStub;
  let headerStub: sinon.SinonStub;
  beforeEach(() => {
    tableStub = sandbox.stub();
    headerStub = sandbox.stub();
    uxMock = stubInterface<Ux>(sandbox, {
      table: tableStub,
      styledHeader: headerStub,
    });
  });

  afterEach(() => {
    sandbox.restore();
    process.exitCode = undefined;
  });

  describe('json', () => {
    const expectedFail = {
      filePath: 'classes/ProductController.cls',
      fullName: 'ProductController',
      state: 'Failed',
      type: 'ApexClass',
      lineNumber: '27',
      columnNumber: '18',
      problemType: 'Error',
      error: 'This component has some problems',
    };
    it('returns expected json for success', () => {
      process.exitCode = 0;
      const formatter = new PushResultFormatter(uxMock as Ux, {}, deployResultSuccess);
      expect(formatter.getJson().pushedSource).to.deep.equal([
        {
          filePath: 'classes/ProductController.cls',
          fullName: 'ProductController',
          state: 'Changed',
          type: 'ApexClass',
        },
      ]);
    });
    it('returns expected json for success with replaements', () => {
      process.exitCode = 0;
      const formatter = new PushResultFormatter(uxMock as Ux, {}, deployResultSuccessWithReplacements);
      const result = formatter.getJson();
      expect(result.pushedSource).to.deep.equal([
        {
          filePath: 'classes/ProductController.cls',
          fullName: 'ProductController',
          state: 'Changed',
          type: 'ApexClass',
        },
      ]);
      expect(result.replacements).to.deep.equal({
        foo: ['bar', 'baz'],
      });
    });
    it('returns expected json for failure', () => {
      const formatter = new PushResultFormatter(uxMock as Ux, {}, deployResultFailure);
      process.exitCode = 1;

      try {
        formatter.getJson();
        throw new Error('should have thrown');
      } catch (error) {
        expect(error).to.have.property('message', 'Push failed. ');
        expect(error).to.have.property('name', 'DeployFailed');
        expect(error).to.have.property('stack').includes('DeployFailed:');
        expect(error).to.have.property('actions').deep.equal([]);
        expect(error).to.have.property('data').deep.equal([expectedFail]);
        expect(error).to.have.property('result').deep.equal([expectedFail]);
        expect(error).to.have.property('context', 'Push');
        expect(error).to.have.property('commandName', 'Push');
        expect(error).to.have.property('status', 1);
        expect(error).to.have.property('exitCode', 1);
      }
    });
    describe('json with quiet', () => {
      it('honors quiet flag for json successes', () => {
        process.exitCode = 0;
        const formatter = new PushResultFormatter(uxMock as Ux, { quiet: true }, deployResultSuccess);
        expect(formatter.getJson().pushedSource).to.deep.equal([]);
        expect(formatter.getJson().replacements).to.be.undefined;
      });
      it('omits replacements', () => {
        process.exitCode = 0;
        const formatter = new PushResultFormatter(uxMock as Ux, { quiet: true }, deployResultSuccessWithReplacements);
        expect(formatter.getJson().pushedSource).to.deep.equal([]);
        expect(formatter.getJson().replacements).to.be.undefined;
      });
      it('honors quiet flag for json failure', () => {
        const formatter = new PushResultFormatter(uxMock as Ux, { quiet: true }, deployResultFailure);
        try {
          formatter.getJson();
          throw new Error('should have thrown');
        } catch (error) {
          expect(error).to.have.property('message', 'Push failed. ');
          expect(error).to.have.property('result').deep.equal([expectedFail]);
        }
      });
    });
  });

  describe('human output', () => {
    it('returns expected output for success', () => {
      process.exitCode = 0;
      const formatter = new PushResultFormatter(uxMock as Ux, {}, deployResultSuccess);
      formatter.display();
      expect(headerStub.callCount, JSON.stringify(headerStub.args)).to.equal(1);
      expect(tableStub.callCount, JSON.stringify(tableStub.args)).to.equal(1);
    });
    it('returns expected output for success with replacements', () => {
      process.exitCode = 0;
      const formatter = new PushResultFormatter(uxMock as Ux, {}, deployResultSuccessWithReplacements);
      formatter.display();
      expect(headerStub.callCount, JSON.stringify(headerStub.args)).to.equal(2);
      expect(headerStub.args[0][0]).to.include('Pushed Source');
      expect(headerStub.args[1][0]).to.include('Metadata Replacements');
      expect(tableStub.callCount, JSON.stringify(tableStub.args)).to.equal(2);
    });
    it('should output as expected for a deploy failure (GACK)', () => {
      const errorMessage =
        'UNKNOWN_EXCEPTION: An unexpected error occurred. Please include this ErrorId if you contact support: 1730955361-49792 (-1117026034)';
      const deployFailure = getDeployResult('failed', { errorMessage });
      deployFailure.response.details.componentFailures = [];
      deployFailure.response.details.componentSuccesses = [];
      delete deployFailure.response.details.runTestResult;
      const formatter = new PushResultFormatter(uxMock as Ux, {}, [deployFailure]);
      sandbox.stub(formatter, 'isSuccess').returns(false);

      try {
        formatter.display();
        expect(false, 'should have thrown a PushFailed error').to.be.true;
      } catch (err) {
        const error = err as Error;
        expect(error.message).to.equal(`Push failed. ${errorMessage}\n`);
        expect(headerStub.called).to.equal(false);
        expect(tableStub.called).to.equal(false);
      }
    });
    describe('quiet', () => {
      it('does not display successes for quiet', () => {
        process.exitCode = 0;
        const formatter = new PushResultFormatter(uxMock as Ux, { quiet: true }, deployResultSuccess);
        formatter.display();
        expect(headerStub.callCount, JSON.stringify(headerStub.args)).to.equal(0);
        expect(formatter.getJson().pushedSource).to.deep.equal([]);
        expect(tableStub.callCount).to.equal(0);
      });
      it('displays errors and throws for quiet', () => {
        process.exitCode = 1;
        const formatter = new PushResultFormatter(uxMock as Ux, { quiet: true }, deployResultFailure);
        try {
          formatter.display();
          throw new Error('should have thrown');
        } catch (err) {
          expect(tableStub.callCount).to.equal(1);
        }
      });
    });

    describe('replacement merging when multiple pushes', () => {
      it('merges the replacements from 2 pushes', () => {
        const deployResultSuccessWithReplacements1 = {
          ...getDeployResult('successSync'),
          replacements: new Map<string, string[]>([
            ['foo', ['bar']],
            ['quux', ['baz']],
          ]),
        } as DeployResult;
        const deployResultSuccessWithReplacements2 = {
          ...getDeployResult('successSync'),
          replacements: new Map<string, string[]>([['foo', ['baz']]]),
        } as DeployResult;
        const result = mergeReplacements([deployResultSuccessWithReplacements1, deployResultSuccessWithReplacements2]);
        expect(result).to.deep.equal(
          new Map<string, string[]>([
            ['foo', ['bar', 'baz']],
            ['quux', ['baz']],
          ])
        );
      });
    });
  });
});
