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
import { Lifecycle, Org, SfdxProject } from '@salesforce/core';
import { UX } from '@salesforce/command';
import { IConfig } from '@oclif/config';
import { Deploy } from '../../../src/commands/force/source/deploy';
import { DeployCommandResult, DeployResultFormatter } from '../../../src/formatters/deployResultFormatter';
import { ComponentSetBuilder, ComponentSetOptions } from '../../../src/componentSetBuilder';
import { getDeployResult } from './deployResponses';
import { exampleSourceComponent } from './testConsts';

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

  // Stubs
  let buildComponentSetStub: sinon.SinonStub;
  let initProgressBarStub: sinon.SinonStub;
  let progressStub: sinon.SinonStub;
  let deployStub: sinon.SinonStub;
  let startStub: sinon.SinonStub;
  let lifecycleEmitStub: sinon.SinonStub;

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
    progressStub = stubMethod(sandbox, cmd, 'progress');
    stubMethod(sandbox, UX.prototype, 'log');
    stubMethod(sandbox, DeployResultFormatter.prototype, 'display');
    stubMethod(sandbox, Deploy.prototype, 'deployRecentValidation').resolves({});
    return cmd.runIt();
  };

  beforeEach(() => {
    startStub = sandbox.stub().returns(deployResult);
    deployStub = sandbox.stub().returns({ start: startStub });
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
    expect(progressStub.callCount).to.equal(callCount);
  };

  it('should pass along sourcepath', async () => {
    const sourcepath = ['somepath'];
    const result = await runDeployCmd(['--sourcepath', sourcepath[0], '--json']);
    expect(result).to.deep.equal(expectedResults);
    expect(progressStub.called).to.be.false;
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

  it('should emit postdeploy hooks for validateddeployrequestid deploys', async () => {
    await runDeployCmd(['--validateddeployrequestid', '0Af0x00000pkAXLCA2']);
    expect(lifecycleEmitStub.firstCall.args[0]).to.equal('postdeploy');
  });

  it('should emit predeploy hooks for async deploys', async () => {
    const sourcepath = ['somepath'];
    try {
      await runDeployCmd(['--sourcepath', sourcepath[0], '--wait', '0']);
    } catch (e) {
      // once async deploys supported remove the try/catch
      expect((e as Error).message).to.include('NOT IMPLEMENTED YET');
    }
    expect(lifecycleEmitStub.firstCall.args[0]).to.equal('predeploy');
  });

  it('should use SOAP by default');
  it('should use REST when restDeploy=true');

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
        ensureProgressBar(0);
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
      ensureProgressBar(1);
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
});
