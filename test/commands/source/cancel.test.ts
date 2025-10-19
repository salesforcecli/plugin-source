/*
 * Copyright 2025, Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { join } from 'node:path';
import sinon from 'sinon';
import { expect } from 'chai';
import { fromStub, spyMethod, stubInterface, stubMethod } from '@salesforce/ts-sinon';
import { ConfigFile, SfProject } from '@salesforce/core';
import { Config } from '@oclif/core';
import { MetadataApiDeploy } from '@salesforce/source-deploy-retrieve';
import { MockTestOrgData, TestContext } from '@salesforce/core/testSetup';

import { Ux } from '@salesforce/sf-plugins-core';
import { Cancel } from '../../../src/commands/force/source/deploy/cancel.js';

import { DeployCancelResultFormatter } from '../../../src/formatters/deployCancelResultFormatter.js';
import { DeployCommandResult } from '../../../src/formatters/deployResultFormatter.js';
import { Stash } from '../../../src/stash.js';

import { getDeployResult } from './deployResponses.js';

describe('force:source:deploy:cancel', () => {
  const $$ = new TestContext();
  const testOrg = new MockTestOrgData();
  const sandbox = $$.SANDBOX;
  testOrg.username = 'cancel-test@org.com';
  const defaultDir = join('my', 'default', 'package');
  const stashedDeployId = 'IMA000STASHID';

  const deployResult = getDeployResult('canceled');
  const expectedResults = deployResult.response as DeployCommandResult;
  expectedResults.deployedSource = deployResult.getFileResponses();
  expectedResults.outboundFiles = [];
  expectedResults.deploys = [deployResult.response];

  // Stubs
  const oclifConfigStub = fromStub(
    stubInterface<Config>(sandbox, {
      runHook: async () =>
        Promise.resolve({
          successes: [],
          failures: [],
        }),
    })
  );
  let pollStub: sinon.SinonStub;
  let cancelStub: sinon.SinonStub;
  let uxLogStub: sinon.SinonStub;

  class TestCancel extends Cancel {
    public async runIt() {
      // oclif would normally populate this, but UT don't have it
      this.id ??= 'force:source:deploy:cancel';
      // required for deprecation warnings to work correctly
      this.ctor.id ??= 'force:source:deploy:cancel';
      await this.init();
      return this.run();
    }

    // eslint-disable-next-line class-methods-use-this
    public createDeploy(): MetadataApiDeploy {
      cancelStub = sandbox.stub(MetadataApiDeploy.prototype, 'cancel');
      return MetadataApiDeploy.prototype;
    }
  }

  const runCancelCmd = async (params: string[]) => {
    const cmd = new TestCancel(params, oclifConfigStub);
    cmd.project = SfProject.getInstance();
    sandbox.stub(cmd.project, 'getUniquePackageDirectories').returns([{ fullPath: defaultDir, path: '', name: '' }]);

    uxLogStub = stubMethod(sandbox, Ux.prototype, 'log');
    stubMethod(sandbox, ConfigFile.prototype, 'get').returns({ jobid: stashedDeployId });
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    pollStub = sandbox.stub(cmd, 'poll').resolves({ response: expectedResults });

    return cmd.runIt();
  };

  beforeEach(async () => {
    await $$.stubAuths(testOrg);
    await $$.stubConfig({ 'target-org': testOrg.username });
  });

  afterEach(() => {
    $$.restore();
    sandbox.restore();
  });

  it('should use stashed deploy ID', async () => {
    const getStashSpy = spyMethod(sandbox, Stash, 'get');
    const result = await runCancelCmd(['--json']);
    expect(result).to.deep.equal(expectedResults);
    expect(getStashSpy.called).to.equal(true);
    expect(pollStub.firstCall.args[1]).to.equal(stashedDeployId);
    expect(cancelStub.calledOnce).to.equal(true);
  });

  it('should display stashed deploy ID', async () => {
    const result = await runCancelCmd([]);
    expect(result).to.deep.equal(expectedResults);
  });

  it('should use the jobid flag', async () => {
    const getStashSpy = spyMethod(sandbox, Stash, 'get');
    const result = await runCancelCmd(['--json', '--jobid', expectedResults.id]);
    expect(result).to.deep.equal(expectedResults);
    expect(getStashSpy.called).to.equal(false);
    expect(pollStub.firstCall.args[1]).to.equal(expectedResults.id);
    expect(cancelStub.calledOnce).to.equal(true);
  });

  it('should display the jobid flag', async () => {
    const result = await runCancelCmd(['--jobid', expectedResults.id]);
    expect(result).to.deep.equal(expectedResults);
    expect(uxLogStub.firstCall.args[0]).to.contain(expectedResults.id);
  });

  it('should display output with no --json', async () => {
    const displayStub = sandbox.stub(DeployCancelResultFormatter.prototype, 'display');
    const getJsonStub = sandbox.stub(DeployCancelResultFormatter.prototype, 'getJson');
    await runCancelCmd([]);
    expect(displayStub.calledOnce).to.equal(true);
    expect(getJsonStub.calledOnce).to.equal(true);
  });

  it('should NOT display output with --json', async () => {
    const displayStub = sandbox.stub(DeployCancelResultFormatter.prototype, 'display');
    const getJsonStub = sandbox.stub(DeployCancelResultFormatter.prototype, 'getJson');
    await runCancelCmd(['--json']);
    expect(displayStub.calledOnce).to.equal(false);
    expect(getJsonStub.calledOnce).to.equal(true);
    expect(uxLogStub.called).to.equal(false);
  });
});
