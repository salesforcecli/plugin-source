/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { join } from 'node:path';
import * as sinon from 'sinon';
import { expect } from 'chai';
import { fromStub, spyMethod, stubInterface, stubMethod } from '@salesforce/ts-sinon';
import { ConfigFile, SfProject } from '@salesforce/core';
import { Config } from '@oclif/core';

import { MetadataApiDeploy, MetadataApiDeployStatus } from '@salesforce/source-deploy-retrieve';
import { Ux } from '@salesforce/sf-plugins-core';
import { MockTestOrgData, TestContext } from '@salesforce/core/lib/testSetup';
import { Report } from '../../../src/commands/force/source/deploy/report';
import { DeployReportResultFormatter } from '../../../src/formatters/deployReportResultFormatter';
import { DeployCommandResult } from '../../../src/formatters/deployResultFormatter';
import { DeployProgressBarFormatter } from '../../../src/formatters/deployProgressBarFormatter';
import { DeployProgressStatusFormatter } from '../../../src/formatters/deployProgressStatusFormatter';
import { Stash } from '../../../src/stash';
import { getDeployResult, getDeployResponse } from './deployResponses';

describe('force:source:report', () => {
  const $$ = new TestContext();
  const testOrg = new MockTestOrgData();
  const sandbox = $$.SANDBOX;
  testOrg.username = 'report-test@org.com';
  const defaultDir = join('my', 'default', 'package');
  const stashedDeployId = 'IMA000STASHID';

  const deployResult = getDeployResult('successSync');
  const expectedResults = deployResult.response as DeployCommandResult;
  expectedResults.deployedSource = deployResult.getFileResponses();
  expectedResults.outboundFiles = [];
  expectedResults.deploys = [deployResult.response];

  // Stubs
  const oclifConfigStub = fromStub(stubInterface<Config>(sandbox));
  let checkDeployStatusStub: sinon.SinonStub;
  let uxLogStub: sinon.SinonStub;
  let pollStatusStub: sinon.SinonStub;

  class TestReport extends Report {
    public async runIt() {
      // oclif would normally populate this, but UT don't have it
      this.id ??= 'force:source:deploy:report';
      // required for deprecation warnings to work correctly
      this.ctor.id ??= 'force:source:deploy:report';
      await this.init();
      return this.run();
    }

    // eslint-disable-next-line class-methods-use-this
    public createDeploy(): MetadataApiDeploy {
      return MetadataApiDeploy.prototype;
    }
  }

  const runReportCmd = async (params: string[], result?: MetadataApiDeployStatus) => {
    const cmd = new TestReport(params, oclifConfigStub);
    cmd.project = SfProject.getInstance();
    sandbox
      .stub(cmd.project, 'getUniquePackageDirectories')
      .returns([{ fullPath: defaultDir, path: defaultDir, name: '' }]);

    uxLogStub = stubMethod(sandbox, Ux.prototype, 'log');
    stubMethod(sandbox, ConfigFile.prototype, 'get').returns({ jobid: stashedDeployId });
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    checkDeployStatusStub = sandbox.stub(cmd, 'report').resolves({ response: result ?? expectedResults });

    return cmd.runIt();
  };

  beforeEach(async () => {
    await $$.stubAuths(testOrg);
    await $$.stubConfig({ 'target-org': testOrg.username });

    pollStatusStub = sandbox.stub(MetadataApiDeploy.prototype, 'pollStatus');
  });

  afterEach(() => {
    $$.restore();
    sandbox.restore();
  });

  it('should use stashed deploy ID', async () => {
    const getStashSpy = spyMethod(sandbox, Stash, 'get');
    const result = await runReportCmd(['--json']);
    expect(result).to.deep.equal(expectedResults);
    expect(getStashSpy.called).to.equal(true);
    expect(checkDeployStatusStub.firstCall.args[1]).to.equal(stashedDeployId);
  });

  it('should display stashed deploy ID', async () => {
    const progressBarStub = sandbox.stub(DeployProgressBarFormatter.prototype, 'progress').returns();
    const result = await runReportCmd([]);
    expect(result).to.deep.equal(expectedResults);
    expect(progressBarStub.calledOnce).to.equal(true);
  });

  it('should use the jobid flag', async () => {
    const getStashSpy = spyMethod(sandbox, Stash, 'get');
    const result = await runReportCmd(['--json', '--jobid', expectedResults.id]);
    expect(result).to.deep.equal(expectedResults);
    expect(getStashSpy.called).to.equal(false);
    expect(checkDeployStatusStub.firstCall.args[1]).to.equal(expectedResults.id);
  });

  it('should display the jobid flag', async () => {
    const progressBarStub = sandbox.stub(DeployProgressBarFormatter.prototype, 'progress').returns();
    const result = await runReportCmd(['--jobid', expectedResults.id]);
    expect(result).to.deep.equal(expectedResults);
    expect(progressBarStub.calledOnce).to.equal(true);
  });

  it('should display output with no --json', async () => {
    const displayStub = sandbox.stub(DeployReportResultFormatter.prototype, 'display');
    const progressBarStub = sandbox.stub(DeployProgressBarFormatter.prototype, 'progress').returns();
    const getJsonStub = sandbox.stub(DeployReportResultFormatter.prototype, 'getJson');
    await runReportCmd([]);
    expect(displayStub.calledOnce).to.equal(true);
    expect(getJsonStub.calledOnce).to.equal(true);
    expect(uxLogStub.called).to.equal(false);
    expect(progressBarStub.calledOnce).to.equal(true);
  });

  it('should NOT display output with --json', async () => {
    const displayStub = sandbox.stub(DeployReportResultFormatter.prototype, 'display');
    const getJsonStub = sandbox.stub(DeployReportResultFormatter.prototype, 'getJson');
    await runReportCmd(['--json']);
    expect(displayStub.calledOnce).to.equal(false);
    expect(getJsonStub.calledOnce).to.equal(true);
    expect(uxLogStub.called).to.equal(false);
  });

  it('should call the correct progress method', async () => {
    const progressBarStub = sandbox.stub(DeployProgressBarFormatter.prototype, 'progress').returns();
    const progressStatusStub = sandbox.stub(DeployProgressStatusFormatter.prototype, 'progress').returns();
    await runReportCmd([]);
    expect(progressStatusStub.calledOnce).to.equal(false);
    expect(progressBarStub.calledOnce).to.equal(true);
    expect(pollStatusStub.calledOnce).to.equal(true);
  });

  it('should NOT error with client timed out when --wait > 0', async () => {
    const inProgressDeployResult = getDeployResponse('inProgress');
    pollStatusStub.reset();
    pollStatusStub.throws(Error('The client has timed out'));
    checkDeployStatusStub.reset();
    checkDeployStatusStub.resolves(inProgressDeployResult);
    const result = await runReportCmd(['--json', '--wait', '1'], inProgressDeployResult);
    expect(result).to.deep.equal(inProgressDeployResult);
  });
});
