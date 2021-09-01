/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { join } from 'path';
import * as sinon from 'sinon';
import { expect } from 'chai';
import { MetadataApiDeployOptions } from '@salesforce/source-deploy-retrieve';
import { fromStub, stubInterface, stubMethod } from '@salesforce/ts-sinon';
import { ConfigAggregator, Lifecycle, Org, SfdxProject, Messages } from '@salesforce/core';
import { UX } from '@salesforce/command';
import { IConfig } from '@oclif/config';
import { Deploy } from '../../../src/commands/force/source/deploy';
import { DeployCommandResult, DeployResultFormatter } from '../../../src/formatters/deployResultFormatter';
import {
  DeployCommandAsyncResult,
  DeployAsyncResultFormatter,
} from '../../../src/formatters/deployAsyncResultFormatter';
import { ComponentSetBuilder, ComponentSetOptions } from '../../../src/componentSetBuilder';
import { DeployProgressBarFormatter } from '../../../src/formatters/deployProgressBarFormatter';
import { DeployProgressStatusFormatter } from '../../../src/formatters/deployProgressStatusFormatter';
import { getDeployResult } from './deployResponses';
import { exampleSourceComponent } from './testConsts';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'deploy');

describe('force:source:deploy', () => {
  const sandbox = sinon.createSandbox();
  const username = 'deploy-test@org.com';
  const packageXml = 'package.xml';
  const defaultDir = join('my', 'default', 'package');
  const oclifConfigStub = fromStub(stubInterface<IConfig>(sandbox));

  const deployResult = getDeployResult('successSync');
  const expectedResults = deployResult.response as DeployCommandResult;
  expectedResults.deployedSource = deployResult.getFileResponses();
  expectedResults.outboundFiles = [];
  expectedResults.deploys = [deployResult.response];

  const expectedAsyncResults: DeployCommandAsyncResult = {
    done: false,
    id: deployResult.response.id,
    state: 'Queued',
    status: 'Queued',
    timedOut: true,
    outboundFiles: [],
    deploys: [
      {
        done: false,
        id: deployResult.response.id,
        state: 'Queued',
        status: 'Queued',
        timedOut: true,
      },
    ],
  };

  // Stubs
  let buildComponentSetStub: sinon.SinonStub;
  let initProgressBarStub: sinon.SinonStub;
  let progressBarStub: sinon.SinonStub;
  let progressStatusStub: sinon.SinonStub;
  let deployStub: sinon.SinonStub;
  let pollStub: sinon.SinonStub;
  let lifecycleEmitStub: sinon.SinonStub;
  let formatterDisplayStub: sinon.SinonStub;
  let resolveProjectConfigStub: sinon.SinonStub;

  class TestDeploy extends Deploy {
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

  const runDeployCmd = async (params: string[]) => {
    const cmd = new TestDeploy(params, oclifConfigStub);
    stubMethod(sandbox, cmd, 'assignProject').callsFake(() => {
      const sfdxProjectStub = fromStub(
        stubInterface<SfdxProject>(sandbox, {
          getUniquePackageDirectories: () => [{ fullPath: defaultDir }],
          resolveProjectConfig: resolveProjectConfigStub,
        })
      );
      cmd.setProject(sfdxProjectStub);
    });
    stubMethod(sandbox, cmd, 'assignOrg').callsFake(() => {
      const orgStub = fromStub(
        stubInterface<Org>(sandbox, {
          getUsername: () => username,
        })
      );
      cmd.setOrg(orgStub);
    });
    initProgressBarStub = stubMethod(sandbox, cmd, 'initProgressBar');
    progressBarStub = stubMethod(sandbox, DeployProgressBarFormatter.prototype, 'progress');
    progressStatusStub = stubMethod(sandbox, DeployProgressStatusFormatter.prototype, 'progress');
    stubMethod(sandbox, UX.prototype, 'log');
    stubMethod(sandbox, Deploy.prototype, 'deployRecentValidation').resolves({});
    formatterDisplayStub = stubMethod(sandbox, DeployResultFormatter.prototype, 'display');
    return cmd.runIt();
  };

  beforeEach(() => {
    resolveProjectConfigStub = sandbox.stub();
    pollStub = sandbox.stub().resolves(deployResult);
    deployStub = sandbox.stub().resolves({
      pollStatus: pollStub,
      id: deployResult.response.id,
    });
    buildComponentSetStub = stubMethod(sandbox, ComponentSetBuilder, 'build').resolves({
      deploy: deployStub,
      getPackageXml: () => packageXml,
      toArray: () => {
        return [exampleSourceComponent];
      },
    });
    lifecycleEmitStub = sandbox.stub(Lifecycle.prototype, 'emit');
  });

  afterEach(() => {
    sandbox.restore();
  });

  // Ensure correct ComponentSetBuilder options
  const ensureCreateComponentSetArgs = (overrides?: Partial<ComponentSetOptions>) => {
    const defaultArgs = {
      sourcepath: undefined,
      manifest: undefined,
      metadata: undefined,
      apiversion: undefined,
      sourceapiversion: undefined,
    };
    const expectedArgs = { ...defaultArgs, ...overrides };

    expect(buildComponentSetStub.calledOnce).to.equal(true);
    expect(buildComponentSetStub.firstCall.args[0]).to.deep.equal(expectedArgs);
  };

  // Ensure ComponentSet.deploy() args
  const ensureDeployArgs = (overrides?: Partial<MetadataApiDeployOptions>) => {
    const expectedDeployArgs = {
      usernameOrConnection: username,
      apiOptions: {
        ignoreWarnings: false,
        rollbackOnError: true,
        checkOnly: false,
        runTests: [],
        testLevel: 'NoTestRun',
        rest: false,
      },
    };
    if (overrides?.apiOptions) {
      expectedDeployArgs.apiOptions = { ...expectedDeployArgs.apiOptions, ...overrides.apiOptions };
    }
    expect(deployStub.calledOnce).to.equal(true);
    expect(deployStub.firstCall.args[0]).to.deep.equal(expectedDeployArgs);
  };

  // Ensure Lifecycle hooks are called properly
  const ensureHookArgs = () => {
    const failureMsg = 'Lifecycle.emit() should be called for predeploy and postdeploy';
    expect(lifecycleEmitStub.calledTwice, failureMsg).to.equal(true);
    expect(lifecycleEmitStub.firstCall.args[0]).to.equal('predeploy');
    expect(lifecycleEmitStub.firstCall.args[1]).to.deep.equal([exampleSourceComponent]);
    expect(lifecycleEmitStub.secondCall.args[0]).to.equal('postdeploy');
    expect(lifecycleEmitStub.secondCall.args[1]).to.deep.equal(deployResult);
  };

  const ensureProgressBar = (callCount: number) => {
    expect(initProgressBarStub.callCount).to.equal(callCount);
  };

  it('should error if sourcepath or manifest arguments are not provided', async () => {
    const requiredFlags = 'manifest, metadata, sourcepath, validateddeployrequestid';
    try {
      await runDeployCmd([]);
    } catch (e) {
      expect((e as Error).message).to.equal(messages.getMessage('MissingRequiredParam', [requiredFlags]));
    }
  });

  it('should pass along sourcepath', async () => {
    const sourcepath = ['somepath'];
    const result = await runDeployCmd(['--sourcepath', sourcepath[0], '--json']);
    expect(result).to.deep.equal(expectedResults);
    ensureCreateComponentSetArgs({ sourcepath });
    ensureDeployArgs();
    ensureHookArgs();
    ensureProgressBar(0);
  });

  it('should pass along metadata', async () => {
    const metadata = ['ApexClass:MyClass'];
    const result = await runDeployCmd(['--metadata', metadata[0], '--json']);
    expect(result).to.deep.equal(expectedResults);
    ensureCreateComponentSetArgs({
      metadata: {
        metadataEntries: metadata,
        directoryPaths: [defaultDir],
      },
    });
    ensureDeployArgs();
    ensureHookArgs();
    ensureProgressBar(0);
  });

  it('should pass along manifest', async () => {
    const manifest = 'package.xml';
    const result = await runDeployCmd(['--manifest', manifest, '--json']);
    expect(result).to.deep.equal(expectedResults);
    ensureCreateComponentSetArgs({
      manifest: {
        manifestPath: manifest,
        directoryPaths: [defaultDir],
      },
    });
    ensureDeployArgs();
    ensureHookArgs();
    ensureProgressBar(0);
  });

  it('should pass along apiversion', async () => {
    const manifest = 'package.xml';
    const apiversion = '50.0';
    const result = await runDeployCmd(['--manifest', manifest, '--apiversion', apiversion, '--json']);
    expect(result).to.deep.equal(expectedResults);
    ensureCreateComponentSetArgs({
      apiversion,
      manifest: {
        manifestPath: manifest,
        directoryPaths: [defaultDir],
      },
    });
    ensureDeployArgs();
    ensureHookArgs();
    ensureProgressBar(0);
  });

  it('should pass along sourceapiversion', async () => {
    const sourceApiVersion = '50.0';
    resolveProjectConfigStub.resolves({ sourceApiVersion });
    const manifest = 'package.xml';
    const result = await runDeployCmd(['--manifest', manifest, '--json']);
    expect(result).to.deep.equal(expectedResults);
    ensureCreateComponentSetArgs({
      sourceapiversion: sourceApiVersion,
      manifest: {
        manifestPath: manifest,
        directoryPaths: [defaultDir],
      },
    });
    ensureDeployArgs();
    ensureHookArgs();
    ensureProgressBar(0);
  });

  it('should pass along all deploy options', async () => {
    const manifest = 'package.xml';
    const runTests = ['MyClassTest'];
    const testLevel = 'RunSpecifiedTests';
    const result = await runDeployCmd([
      `--manifest=${manifest}`,
      '--ignorewarnings',
      '--ignoreerrors',
      '--checkonly',
      `--runtests=${runTests[0]}`,
      `--testlevel=${testLevel}`,
      '--json',
    ]);

    expect(result).to.deep.equal(expectedResults);
    ensureCreateComponentSetArgs({
      manifest: {
        manifestPath: manifest,
        directoryPaths: [defaultDir],
      },
    });

    // Ensure ComponentSet.deploy() overridden args
    ensureDeployArgs({
      apiOptions: {
        ignoreWarnings: true,
        rollbackOnError: false,
        checkOnly: true,
        runTests,
        testLevel,
      },
    });
    ensureHookArgs();
    ensureProgressBar(0);
  });

  describe('SOAP/REST', () => {
    it('should use SOAP by default', async () => {
      delete process.env.SFDX_REST_DEPLOY;
      const sourcepath = ['somepath'];
      const cmd = new TestDeploy(['--sourcepath', sourcepath[0]], oclifConfigStub);
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore private method
      expect(cmd.isRest).to.be.false;
    });

    it('should use SOAP from the env var', async () => {
      try {
        process.env.SFDX_REST_DEPLOY = 'false';
        const sourcepath = ['somepath'];
        const cmd = new TestDeploy(['--sourcepath', sourcepath[0]], oclifConfigStub);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore private method
        expect(cmd.isRest).to.be.false;
      } finally {
        delete process.env.SFDX_REST_DEPLOY;
      }
    });

    it('should use REST from the env var', async () => {
      try {
        process.env.SFDX_REST_DEPLOY = 'true';
        const sourcepath = ['somepath'];
        const cmd = new TestDeploy(['--sourcepath', sourcepath[0]], oclifConfigStub);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore private method
        expect(cmd.isRest).to.be.false;
      } finally {
        delete process.env.SFDX_REST_DEPLOY;
      }
    });

    it('should use SOAP by overriding env var with flag', async () => {
      try {
        process.env.SFDX_REST_DEPLOY = 'true';
        const sourcepath = ['somepath'];
        const cmd = new TestDeploy(['--sourcepath', sourcepath[0], '--soapdeploy'], oclifConfigStub);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore private method
        expect(cmd.isRest).to.be.false;
      } finally {
        delete process.env.SFDX_REST_DEPLOY;
      }
    });

    it('should use SOAP from flag', async () => {
      const sourcepath = ['somepath'];
      const cmd = new TestDeploy(['--sourcepath', sourcepath[0], '--soapdeploy'], oclifConfigStub);
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore private method
      expect(cmd.isRest).to.be.false;
    });

    it('should use SOAP from config', async () => {
      stubMethod(sandbox, ConfigAggregator, 'create').resolves(ConfigAggregator.prototype);
      stubMethod(sandbox, ConfigAggregator.prototype, 'getPropertyValue').returns('false');
      const sourcepath = ['somepath'];
      const cmd = new TestDeploy(['--sourcepath', sourcepath[0], '--soapdeploy'], oclifConfigStub);
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore private method
      expect(cmd.isRest).to.be.false;
    });

    it('should use SOAP by overriding env var with config', async () => {
      try {
        process.env.SFDX_REST_DEPLOY = 'true';
        stubMethod(sandbox, ConfigAggregator, 'create').resolves(ConfigAggregator.prototype);
        stubMethod(sandbox, ConfigAggregator.prototype, 'getPropertyValue').returns('false');
        const sourcepath = ['somepath'];
        const cmd = new TestDeploy(['--sourcepath', sourcepath[0], '--soapdeploy'], oclifConfigStub);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore private method
        expect(cmd.isRest).to.be.false;
      } finally {
        delete process.env.SFDX_REST_DEPLOY;
      }
    });
  });

  describe('Hooks', () => {
    it('should emit postdeploy hooks for validateddeployrequestid deploys', async () => {
      await runDeployCmd(['--validateddeployrequestid', '0Af0x00000pkAXLCA2']);
      expect(lifecycleEmitStub.firstCall.args[0]).to.equal('postdeploy');
    });

    it('should emit predeploy hooks for async deploys', async () => {
      const sourcepath = ['somepath'];
      await runDeployCmd(['--sourcepath', sourcepath[0], '--wait', '0']);
      expect(lifecycleEmitStub.firstCall.args[0]).to.equal('predeploy');
    });
  });

  describe('Progress Bar', () => {
    it('should NOT call progress bar because of environment variable', async () => {
      try {
        process.env.SFDX_USE_PROGRESS_BAR = 'false';
        const sourcepath = ['somepath'];
        const result = await runDeployCmd(['--sourcepath', sourcepath[0]]);
        expect(result).to.deep.equal(expectedResults);
        ensureCreateComponentSetArgs({ sourcepath });
        ensureDeployArgs();
        ensureHookArgs();
        expect(progressStatusStub.calledOnce).to.be.true;
        expect(progressBarStub.calledOnce).to.be.false;
      } finally {
        delete process.env.SFDX_USE_PROGRESS_BAR;
      }
    });

    it('should call progress bar', async () => {
      const sourcepath = ['somepath'];
      const result = await runDeployCmd(['--sourcepath', sourcepath[0]]);
      expect(result).to.deep.equal(expectedResults);
      ensureCreateComponentSetArgs({ sourcepath });
      ensureDeployArgs();
      ensureHookArgs();
      expect(progressStatusStub.calledOnce).to.be.false;
      expect(progressBarStub.calledOnce).to.be.true;
    });

    it('should NOT call progress bar because of --json', async () => {
      const sourcepath = ['somepath'];
      const result = await runDeployCmd(['--json', '--sourcepath', sourcepath[0]]);
      expect(result).to.deep.equal(expectedResults);
      ensureCreateComponentSetArgs({ sourcepath });
      ensureDeployArgs();
      ensureHookArgs();
      ensureProgressBar(0);
    });

    it('should start the progress bar only once with data onUpdate');
    it('should display the deploy ID only once onUpdate');
    it('should update progress bar with data onUpdate');
    it('should setTotal on the progress bar with data onUpdate');
    it('should update and stop progress bar with data onFinish');
    it('should stop progress bar onCancel');
    it('should stop progress bar onError');
  });

  it('should return JSON format and not display for a synchronous deploy', async () => {
    const result = await runDeployCmd(['--sourcepath', 'somepath', '--json']);
    expect(formatterDisplayStub.calledOnce).to.equal(false);
    expect(result).to.deep.equal(expectedResults);
  });

  it('should return JSON format and not display for an asynchronous deploy', async () => {
    const formatterAsyncDisplayStub = stubMethod(sandbox, DeployAsyncResultFormatter.prototype, 'display');
    const result = await runDeployCmd(['--sourcepath', 'somepath', '--json', '--wait', '0']);
    expect(formatterAsyncDisplayStub.calledOnce).to.equal(false);
    expect(result).to.deep.equal(expectedAsyncResults);
  });

  it('should return JSON format and display for a synchronous deploy', async () => {
    const result = await runDeployCmd(['--sourcepath', 'somepath']);
    expect(formatterDisplayStub.calledOnce).to.equal(true);
    expect(result).to.deep.equal(expectedResults);
  });

  it('should return JSON format and display for an asynchronous deploy', async () => {
    const formatterAsyncDisplayStub = stubMethod(sandbox, DeployAsyncResultFormatter.prototype, 'display');
    const result = await runDeployCmd(['--sourcepath', 'somepath', '--wait', '0']);
    expect(formatterAsyncDisplayStub.calledOnce).to.equal(true);
    expect(result).to.deep.equal(expectedAsyncResults);
  });
});
