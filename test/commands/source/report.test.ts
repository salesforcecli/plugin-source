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
import { ConfigFile, Org, SfdxProject } from '@salesforce/core';
import { IConfig } from '@oclif/config';
import { UX } from '@salesforce/command';
import { Report } from '../../../src/commands/force/source/deploy/report';
import { DeployReportResultFormatter } from '../../../src/formatters/deployReportResultFormatter';
import { DeployCommandResult } from '../../../src/formatters/deployResultFormatter';
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

  class TestReport extends Report {
    public async runIt() {
      await this.init();
      return this.run();
    }
    public setOrg(org: Org) {
      this.org = org;
    }
    public setProject(project: SfdxProject) {
      this.project = project;
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
    stubMethod(sandbox, ConfigFile.prototype, 'readSync');
    stubMethod(sandbox, ConfigFile.prototype, 'get').returns({ jobid: stashedDeployId });
    checkDeployStatusStub = sandbox.stub().resolves(expectedResults);

    return cmd.runIt();
  };

  afterEach(() => {
    sandbox.restore();
  });

  it('should use stashed deploy ID', async () => {
    const getStashSpy = spyMethod(sandbox, Report.prototype, 'getStash');
    const result = await runReportCmd(['--json']);
    expect(result).to.deep.equal(expectedResults);
    expect(getStashSpy.called).to.equal(true);
    expect(checkDeployStatusStub.firstCall.args[0]).to.equal(stashedDeployId);
  });

  it('should display stashed deploy ID', async () => {
    const result = await runReportCmd([]);
    expect(result).to.deep.equal(expectedResults);
    expect(uxLogStub.firstCall.args[0]).to.contain(stashedDeployId);
  });

  it('should use the jobid flag', async () => {
    const getStashSpy = spyMethod(sandbox, Report.prototype, 'getStash');
    const result = await runReportCmd(['--json', '--jobid', expectedResults.id]);
    expect(result).to.deep.equal(expectedResults);
    expect(getStashSpy.called).to.equal(false);
    expect(checkDeployStatusStub.firstCall.args[0]).to.equal(expectedResults.id);
  });

  it('should display the jobid flag', async () => {
    const result = await runReportCmd(['--jobid', expectedResults.id]);
    expect(result).to.deep.equal(expectedResults);
    expect(uxLogStub.firstCall.args[0]).to.contain(expectedResults.id);
  });

  it('should display output with no --json', async () => {
    const displayStub = sandbox.stub(DeployReportResultFormatter.prototype, 'display');
    const getJsonStub = sandbox.stub(DeployReportResultFormatter.prototype, 'getJson');
    await runReportCmd([]);
    expect(displayStub.calledOnce).to.equal(true);
    expect(getJsonStub.calledOnce).to.equal(true);
    expect(uxLogStub.called).to.equal(true);
  });

  it('should NOT display output with --json', async () => {
    const displayStub = sandbox.stub(DeployReportResultFormatter.prototype, 'display');
    const getJsonStub = sandbox.stub(DeployReportResultFormatter.prototype, 'getJson');
    await runReportCmd(['--json']);
    expect(displayStub.calledOnce).to.equal(false);
    expect(getJsonStub.calledOnce).to.equal(true);
    expect(uxLogStub.called).to.equal(false);
  });
});
