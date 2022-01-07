/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { join } from 'path';
import * as fs from 'fs';
import * as sinon from 'sinon';
import { assert, expect } from 'chai';
import { fromStub, spyMethod, stubInterface, stubMethod } from '@salesforce/ts-sinon';
import { ConfigFile, Org, SfdxProject } from '@salesforce/core';
import { IConfig } from '@oclif/config';
import { UX } from '@salesforce/command';
import { MetadataApiDeploy } from '@salesforce/source-deploy-retrieve';
import { Report } from '../../../src/commands/force/source/deploy/report';
import { DeployReportResultFormatter } from '../../../src/formatters/deployReportResultFormatter';
import { DeployCommandResult } from '../../../src/formatters/deployResultFormatter';
import { DeployProgressBarFormatter } from '../../../src/formatters/deployProgressBarFormatter';
import { DeployProgressStatusFormatter } from '../../../src/formatters/deployProgressStatusFormatter';
import { Stash } from '../../../src/stash';
import { getDeployResult } from './deployResponses';

describe('force:source:report', () => {
  const sandbox = sinon.createSandbox();
  const username = 'report-test@org.com';
  const defaultDir = join('my', 'default', 'package');
  const stashedDeployId = 'IMA000STASHID';

  const deployResult = getDeployResult('successSync');
  const expectedResults = deployResult.response as DeployCommandResult;
  expectedResults.deployedSource = deployResult.getFileResponses();
  expectedResults.outboundFiles = [];
  expectedResults.deploys = [deployResult.response];

  // Stubs
  const oclifConfigStub = fromStub(stubInterface<IConfig>(sandbox));
  let checkDeployStatusStub: sinon.SinonStub;
  let uxLogStub: sinon.SinonStub;
  let pollStatusStub: sinon.SinonStub;
  let readSyncStub: sinon.SinonStub;

  class TestReport extends Report {
    public async runIt() {
      await this.init();
      // oclif would normally populate this, but UT don't have it
      this.id ??= 'force:source:deploy:report';
      return this.run();
    }
    public setOrg(org: Org) {
      this.org = org;
    }
    public setProject(project: SfdxProject) {
      this.project = project;
    }

    public createDeploy(): MetadataApiDeploy {
      pollStatusStub = sandbox.stub(MetadataApiDeploy.prototype, 'pollStatus');
      return MetadataApiDeploy.prototype;
    }
  }

  const runReportCmd = async (params: string[]) => {
    const cmd = new TestReport(params, oclifConfigStub);
    stubMethod(sandbox, cmd, 'assignProject').callsFake(() => {
      const sfdxProjectStub = fromStub(
        stubInterface<SfdxProject>(sandbox, {
          getUniquePackageDirectories: () => [{ fullPath: defaultDir }],
        })
      );
      cmd.setProject(sfdxProjectStub);
    });
    stubMethod(sandbox, cmd, 'assignOrg').callsFake(() => {
      const orgStub = fromStub(
        stubInterface<Org>(sandbox, {
          getUsername: () => username,
          getConnection: () => ({
            metadata: {
              checkDeployStatus: checkDeployStatusStub,
            },
          }),
        })
      );
      cmd.setOrg(orgStub);
    });
    uxLogStub = stubMethod(sandbox, UX.prototype, 'log');
    stubMethod(sandbox, ConfigFile.prototype, 'get').returns({ jobid: stashedDeployId });
    checkDeployStatusStub = sandbox.stub().resolves(expectedResults);

    return cmd.runIt();
  };

  beforeEach(() => {
    readSyncStub = stubMethod(sandbox, ConfigFile.prototype, 'readSync');
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should use stashed deploy ID', async () => {
    const getStashSpy = spyMethod(sandbox, Stash, 'get');
    const result = await runReportCmd(['--json']);
    expect(result).to.deep.equal(expectedResults);
    expect(getStashSpy.called).to.equal(true);
    expect(checkDeployStatusStub.firstCall.args[0]).to.equal(stashedDeployId);
  });

  it('should display stashed deploy ID', async () => {
    const progressBarStub = sandbox.stub(DeployProgressBarFormatter.prototype, 'progress').returns();
    const result = await runReportCmd([]);
    expect(result).to.deep.equal(expectedResults);
    expect(uxLogStub.firstCall.args[0]).to.contain(stashedDeployId);
    expect(progressBarStub.calledOnce).to.equal(true);
  });

  it('should rename corrupt stash.json and throw an error', async () => {
    const jsonParseError = new Error();
    jsonParseError.name = 'JsonParseError';
    readSyncStub.throws(jsonParseError);
    const renameSyncStub = stubMethod(sandbox, fs, 'renameSync');
    try {
      await runReportCmd(['--json']);
      assert(false, 'Expected report command to throw a JsonParseError');
    } catch (error: unknown) {
      const err = error as Error;
      expect(err.name).to.equal('InvalidStashFile');
      expect(renameSyncStub.calledOnce).to.be.true;
    }
  });

  it('should use the jobid flag', async () => {
    const getStashSpy = spyMethod(sandbox, Stash, 'get');
    const result = await runReportCmd(['--json', '--jobid', expectedResults.id]);
    expect(result).to.deep.equal(expectedResults);
    expect(getStashSpy.called).to.equal(false);
    expect(checkDeployStatusStub.firstCall.args[0]).to.equal(expectedResults.id);
  });

  it('should display the jobid flag', async () => {
    const progressBarStub = sandbox.stub(DeployProgressBarFormatter.prototype, 'progress').returns();
    const result = await runReportCmd(['--jobid', expectedResults.id]);
    expect(result).to.deep.equal(expectedResults);
    expect(uxLogStub.firstCall.args[0]).to.contain(expectedResults.id);
    expect(progressBarStub.calledOnce).to.equal(true);
  });

  it('should display output with no --json', async () => {
    const displayStub = sandbox.stub(DeployReportResultFormatter.prototype, 'display');
    const progressBarStub = sandbox.stub(DeployProgressBarFormatter.prototype, 'progress').returns();
    const getJsonStub = sandbox.stub(DeployReportResultFormatter.prototype, 'getJson');
    await runReportCmd([]);
    expect(displayStub.calledOnce).to.equal(true);
    expect(getJsonStub.calledOnce).to.equal(true);
    expect(uxLogStub.called).to.equal(true);
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
});
