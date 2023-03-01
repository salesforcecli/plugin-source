/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { join } from 'path';
import * as sinon from 'sinon';
import { expect } from 'chai';
import { fromStub, spyMethod, stubInterface, stubMethod } from '@salesforce/ts-sinon';
import { ConfigFile, SfProject } from '@salesforce/core';
import { Config } from '@oclif/core';
import { MetadataApiDeploy } from '@salesforce/source-deploy-retrieve';
import { MockTestOrgData, TestContext } from '@salesforce/core/lib/testSetup';
import { Ux } from '@salesforce/sf-plugins-core';
import { Cancel } from '../../../src/commands/force/source/deploy/cancel';
import { DeployCancelResultFormatter } from '../../../src/formatters/deployCancelResultFormatter';
import { DeployCommandResult } from '../../../src/formatters/deployResultFormatter';
import { Stash } from '../../../src/stash';
import { getDeployResult } from './deployResponses';

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
  const oclifConfigStub = fromStub(stubInterface<Config>(sandbox));
  let pollStub: sinon.SinonStub;
  let cancelStub: sinon.SinonStub;
  let uxLogStub: sinon.SinonStub;

  class TestCancel extends Cancel {
    public async runIt() {
      await this.init();
      // oclif would normally populate this, but UT don't have it
      this.id ??= 'force:source:deploy:cancel';
      return this.run();
    }

    // eslint-disable-next-line class-methods-use-this
    public createDeploy(): MetadataApiDeploy {
      cancelStub = sandbox.stub(MetadataApiDeploy.prototype, 'cancel');
      return MetadataApiDeploy.prototype;
    }
  }

  const runCancelCmd = async (params: string[]) => {
    params.push('-o', testOrg.username);
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
