/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { join } from 'node:path';

import sinon from 'sinon';
import { expect } from 'chai';
import { ComponentSetBuilder, ComponentSetOptions, MetadataApiDeployOptions } from '@salesforce/source-deploy-retrieve';
import { fromStub, stubInterface, stubMethod } from '@salesforce/ts-sinon';
import { AnyJson } from '@salesforce/ts-types';
import { ConfigAggregator, Lifecycle, Messages, SfProject } from '@salesforce/core';
import { Config } from '@oclif/core';
import { SfCommand } from '@salesforce/sf-plugins-core';
import { MockTestOrgData, TestContext } from '@salesforce/core/testSetup';
import { Deploy } from '../../../src/commands/force/source/deploy.js';
import { DeployCommandResult, DeployResultFormatter } from '../../../src/formatters/deployResultFormatter.js';
import {
  DeployAsyncResultFormatter,
  DeployCommandAsyncResult,
} from '../../../src/formatters/source/deployAsyncResultFormatter.js';
import { DeployProgressBarFormatter } from '../../../src/formatters/deployProgressBarFormatter.js';
import { DeployProgressStatusFormatter } from '../../../src/formatters/deployProgressStatusFormatter.js';
import { getDeployResult } from './deployResponses.js';
import { exampleSourceComponent } from './testConsts.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
describe('force:source:deploy', () => {
  const $$ = new TestContext();
  const testOrg = new MockTestOrgData();
  const sandbox = $$.SANDBOX;
  testOrg.username = 'deploy-test@org.com';
  const packageXml = 'package.xml';
  const defaultDir = join('my', 'default', 'package');
  const oclifConfigStub = fromStub(
    stubInterface<Config>(sandbox, {
      runHook: async () =>
        Promise.resolve({
          successes: [],
          failures: [],
        }),
    })
  );

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
      // oclif would normally populate this, but UT don't have it
      this.id ??= 'force:source:deploy';
      // required for deprecation warnings to work correctly
      this.ctor.id ??= 'force:source:deploy';
      await this.init();
      return this.run();
    }
  }

  const runDeployCmd = async (params: string[], options?: { sourceApiVersion?: string }) => {
    const cmd = new TestDeploy(params, oclifConfigStub);
    cmd.project = SfProject.getInstance();
    cmd.configAggregator =
      await // this is simplified from https://github.com/salesforcecli/plugin-deploy-retrieve/blob/d481ac1d79e29e20302924e688be7ec75df22957/src/configMeta.ts#L24-L25
      // as a workaround for
      // 1. PDR being ESM before plugin-source
      // 2. lib/configMeta.js not being in the top-level exports
      (
        await ConfigAggregator.create({
          customConfigMeta: [
            {
              key: 'org-metadata-rest-deploy',
              description: 'foo',
              hidden: true,
              input: {
                validator: (value: AnyJson): boolean => typeof value === 'string' && ['true', 'false'].includes(value),
                failedMessage: 'boo!',
              },
            },
          ],
        })
      ).reload();
    sandbox.stub(cmd.project, 'getDefaultPackage').returns({ name: '', path: '', fullPath: defaultDir });
    sandbox.stub(cmd.project, 'getUniquePackageDirectories').returns([{ fullPath: defaultDir, path: '', name: '' }]);
    sandbox.stub(cmd.project, 'getPackageDirectories').returns([{ fullPath: defaultDir, path: '', name: '' }]);
    sandbox.stub(cmd.project, 'resolveProjectConfig').resolves({ sourceApiVersion: options?.sourceApiVersion });

    initProgressBarStub = stubMethod(sandbox, cmd, 'initProgressBar');
    progressBarStub = stubMethod(sandbox, DeployProgressBarFormatter.prototype, 'progress');
    progressStatusStub = stubMethod(sandbox, DeployProgressStatusFormatter.prototype, 'progress');
    stubMethod(sandbox, SfCommand.prototype, 'log');
    stubMethod(sandbox, Deploy.prototype, 'deployRecentValidation').resolves({});
    formatterDisplayStub = stubMethod(sandbox, DeployResultFormatter.prototype, 'display');
    return cmd.runIt();
  };

  beforeEach(async () => {
    resetEnv();
    await $$.stubAuths(testOrg);
    await $$.stubConfig({ 'target-org': testOrg.username });

    resolveProjectConfigStub = sandbox.stub();
    pollStub = sandbox.stub().resolves(deployResult);
    deployStub = sandbox.stub().resolves({
      pollStatus: pollStub,
      id: deployResult.response.id,
    });
    buildComponentSetStub = stubMethod(sandbox, ComponentSetBuilder, 'build').resolves({
      deploy: deployStub,
      getPackageXml: () => packageXml,
      toArray: () => [exampleSourceComponent],
    });
    lifecycleEmitStub = sandbox.stub(Lifecycle.prototype, 'emit');
  });

  afterEach(() => {
    $$.restore();
    sandbox.restore();
    resetEnv();
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
    const expectedArgs: Partial<ComponentSetOptions> = { ...defaultArgs, ...overrides };

    expect(buildComponentSetStub.calledOnce).to.equal(true);
    expect(buildComponentSetStub.firstCall.args[0]).to.deep.equal(expectedArgs);
  };

  // Ensure ComponentSet.deploy() args
  const ensureDeployArgs = (overrides?: Partial<MetadataApiDeployOptions>) => {
    const expectedDeployArgs = {
      usernameOrConnection: testOrg.username,
      apiOptions: {
        ignoreWarnings: false,
        rollbackOnError: true,
        checkOnly: false,
        purgeOnDelete: false,
        rest: false,
        ...overrides?.apiOptions,
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
    // there's also a warning about the deprecated env
    expect(lifecycleEmitStub.callCount, failureMsg).to.be.greaterThanOrEqual(2);
    const predeploy = lifecycleEmitStub.getCalls().find((call) => call.args[0] === 'predeploy');
    const postdeploy = lifecycleEmitStub.getCalls().find((call) => call.args[0] === 'postdeploy');

    expect(predeploy?.args[1]).to.deep.equal([exampleSourceComponent]);
    expect(postdeploy?.args[1]).to.deep.equal(deployResult);
  };

  const ensureProgressBar = (callCount: number) => {
    expect(initProgressBarStub.callCount).to.equal(callCount);
  };

  describe('long command flags', () => {
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
          destructiveChangesPost: undefined,
          destructiveChangesPre: undefined,
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
          destructiveChangesPost: undefined,
          destructiveChangesPre: undefined,
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
      const result = await runDeployCmd(['--manifest', manifest, '--json'], { sourceApiVersion });
      expect(result).to.deep.equal(expectedResults);
      ensureCreateComponentSetArgs({
        sourceapiversion: sourceApiVersion,
        manifest: {
          manifestPath: manifest,
          directoryPaths: [defaultDir],
          destructiveChangesPost: undefined,
          destructiveChangesPre: undefined,
        },
      });
      ensureDeployArgs();
      ensureHookArgs();
      ensureProgressBar(0);
    });

    it('should pass purgeOnDelete flag', async () => {
      const manifest = 'package.xml';
      const destructiveChanges = 'destructiveChangesPost.xml';
      const runTests = ['MyClassTest'];
      const testLevel = 'RunSpecifiedTests';
      const result = await runDeployCmd([
        `--manifest=${manifest}`,
        `--postdestructivechanges=${destructiveChanges}`,
        '--ignorewarnings',
        '--ignoreerrors',
        '--checkonly',
        `--runtests=${runTests[0]}`,
        `--testlevel=${testLevel}`,
        '--purgeondelete',
        '--json',
      ]);

      expect(result).to.deep.equal(expectedResults);
      ensureDeployArgs({
        apiOptions: {
          checkOnly: true,
          ignoreWarnings: true,
          purgeOnDelete: true,
          rest: false,
          rollbackOnError: false,
          runTests,
          testLevel,
        },
      });
      ensureCreateComponentSetArgs({
        manifest: {
          manifestPath: manifest,
          directoryPaths: [defaultDir],
          destructiveChangesPost: destructiveChanges,
          destructiveChangesPre: undefined,
        },
      });
      ensureHookArgs();
      ensureProgressBar(0);
    });

    it('should pass default purgeondelete flag to false', async () => {
      const manifest = 'package.xml';
      const destructiveChanges = 'destructiveChangesPost.xml';
      const runTests = ['MyClassTest'];
      const testLevel = 'RunSpecifiedTests';
      const result = await runDeployCmd([
        `--manifest=${manifest}`,
        `--postdestructivechanges=${destructiveChanges}`,
        '--ignorewarnings',
        '--ignoreerrors',
        '--checkonly',
        `--runtests=${runTests[0]}`,
        `--testlevel=${testLevel}`,
        '--json',
      ]);

      expect(result).to.deep.equal(expectedResults);
      ensureDeployArgs({
        apiOptions: {
          checkOnly: true,
          ignoreWarnings: true,
          purgeOnDelete: false,
          rest: false,
          rollbackOnError: false,
          runTests,
          testLevel,
        },
      });
      ensureCreateComponentSetArgs({
        manifest: {
          manifestPath: manifest,
          directoryPaths: [defaultDir],
          destructiveChangesPost: destructiveChanges,
          destructiveChangesPre: undefined,
        },
      });
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
          destructiveChangesPost: undefined,
          destructiveChangesPre: undefined,
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
      it('should override env var with --soapdeploy', async () => {
        process.env.SFDX_REST_DEPLOY = 'true';
        const manifest = 'package.xml';
        const result = await runDeployCmd(['--manifest', manifest, '--soapdeploy', '--json']);
        expect(result).to.deep.equal(expectedResults);
        ensureCreateComponentSetArgs({
          manifest: {
            manifestPath: manifest,
            directoryPaths: [defaultDir],
            destructiveChangesPost: undefined,
            destructiveChangesPre: undefined,
          },
        });
        ensureDeployArgs();
        ensureHookArgs();
        ensureProgressBar(0);
      });

      it('should override config with --soapdeploy', async () => {
        await $$.stubConfig({ 'org-metadata-rest-deploy': 'true', 'target-org': testOrg.username });
        const manifest = 'package.xml';
        const result = await runDeployCmd(['--manifest', manifest, '--soapdeploy', '--json']);
        expect(result).to.deep.equal(expectedResults);
        ensureCreateComponentSetArgs({
          manifest: {
            manifestPath: manifest,
            directoryPaths: [defaultDir],
            destructiveChangesPost: undefined,
            destructiveChangesPre: undefined,
          },
        });
        ensureDeployArgs();
        ensureHookArgs();
        ensureProgressBar(0);
      });

      it('should REST deploy with config', async () => {
        await $$.stubConfig({ 'org-metadata-rest-deploy': 'true', 'target-org': testOrg.username });

        const manifest = 'package.xml';
        const result = await runDeployCmd(['--manifest', manifest, '--json']);
        expect(result).to.deep.equal(expectedResults);
        ensureCreateComponentSetArgs({
          manifest: {
            manifestPath: manifest,
            directoryPaths: [defaultDir],
            destructiveChangesPost: undefined,
            destructiveChangesPre: undefined,
          },
        });
        ensureDeployArgs({ apiOptions: { rest: true } });
        ensureHookArgs();
        ensureProgressBar(0);
      });

      it('should REST deploy', async () => {
        process.env.SFDX_REST_DEPLOY = 'true';
        const manifest = 'package.xml';
        const result = await runDeployCmd(['--manifest', manifest, '--json']);
        expect(result).to.deep.equal(expectedResults);
        ensureCreateComponentSetArgs({
          manifest: {
            manifestPath: manifest,
            directoryPaths: [defaultDir],
            destructiveChangesPost: undefined,
            destructiveChangesPre: undefined,
          },
        });
        ensureDeployArgs({ apiOptions: { rest: true } });
        ensureHookArgs();
        ensureProgressBar(0);
      });

      it('should use SOAP by default', () => {
        const sourcepath = ['somepath'];
        const cmd = new TestDeploy(['--sourcepath', sourcepath[0]], oclifConfigStub);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore private method
        expect(cmd.isRest).to.be.false;
      });

      it('should use SOAP from the env var', () => {
        process.env.SFDX_REST_DEPLOY = 'false';
        const sourcepath = ['somepath'];
        const cmd = new TestDeploy(['--sourcepath', sourcepath[0]], oclifConfigStub);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore private method
        expect(cmd.isRest).to.be.false;
      });

      it('should use REST from the env var', () => {
        process.env.SFDX_REST_DEPLOY = 'true';
        const sourcepath = ['somepath'];
        const cmd = new TestDeploy(['--sourcepath', sourcepath[0]], oclifConfigStub);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore private method
        expect(cmd.isRest).to.be.false;
      });

      it('should use SOAP by overriding env var with flag', () => {
        process.env.SFDX_REST_DEPLOY = 'true';
        const sourcepath = ['somepath'];
        const cmd = new TestDeploy(['--sourcepath', sourcepath[0], '--soapdeploy'], oclifConfigStub);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore private method
        expect(cmd.isRest).to.be.false;
      });

      it('should use SOAP from flag', () => {
        const sourcepath = ['somepath'];
        const cmd = new TestDeploy(['--sourcepath', sourcepath[0], '--soapdeploy'], oclifConfigStub);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore private method
        expect(cmd.isRest).to.be.false;
      });

      it('should use SOAP from config', () => {
        stubMethod(sandbox, ConfigAggregator, 'create').resolves(ConfigAggregator.prototype);
        stubMethod(sandbox, ConfigAggregator.prototype, 'getPropertyValue').returns('false');
        const sourcepath = ['somepath'];
        const cmd = new TestDeploy(['--sourcepath', sourcepath[0], '--soapdeploy'], oclifConfigStub);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore private method
        expect(cmd.isRest).to.be.false;
      });

      it('should use SOAP by overriding env var with config', () => {
        process.env.SFDX_REST_DEPLOY = 'true';
        stubMethod(sandbox, ConfigAggregator, 'create').resolves(ConfigAggregator.prototype);
        stubMethod(sandbox, ConfigAggregator.prototype, 'getPropertyValue').returns('false');
        const sourcepath = ['somepath'];
        const cmd = new TestDeploy(['--sourcepath', sourcepath[0], '--soapdeploy'], oclifConfigStub);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore private method
        expect(cmd.isRest).to.be.false;
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
          process.env.SF_USE_PROGRESS_BAR = 'false';
          const sourcepath = ['somepath'];
          const result = await runDeployCmd(['--sourcepath', sourcepath[0]]);
          expect(result).to.deep.equal(expectedResults);
          ensureCreateComponentSetArgs({ sourcepath });
          ensureDeployArgs();
          ensureHookArgs();
          expect(progressStatusStub.calledOnce).to.be.true;
          expect(progressBarStub.calledOnce).to.be.false;
        } finally {
          delete process.env.SF_USE_PROGRESS_BAR;
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

  describe('short command flags', () => {
    it('should pass along sourcepath', async () => {
      const sourcepath = ['somepath'];
      const result = await runDeployCmd(['-p', sourcepath[0], '--json']);
      expect(result).to.deep.equal(expectedResults);
      ensureCreateComponentSetArgs({ sourcepath });
      ensureDeployArgs();
      ensureHookArgs();
      ensureProgressBar(0);
    });

    it('should pass along metadata', async () => {
      const metadata = ['ApexClass:MyClass'];
      const result = await runDeployCmd(['-m', metadata[0], '--json']);
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
      const result = await runDeployCmd(['-x', manifest, '--json']);
      expect(result).to.deep.equal(expectedResults);
      ensureCreateComponentSetArgs({
        manifest: {
          manifestPath: manifest,
          directoryPaths: [defaultDir],
          destructiveChangesPost: undefined,
          destructiveChangesPre: undefined,
        },
      });
      ensureDeployArgs();
      ensureHookArgs();
      ensureProgressBar(0);
    });

    it('should pass along apiversion', async () => {
      const manifest = 'package.xml';
      const apiversion = '50.0';
      const result = await runDeployCmd(['-x', manifest, '--apiversion', apiversion, '--json']);
      expect(result).to.deep.equal(expectedResults);
      ensureCreateComponentSetArgs({
        apiversion,
        manifest: {
          manifestPath: manifest,
          directoryPaths: [defaultDir],
          destructiveChangesPost: undefined,
          destructiveChangesPre: undefined,
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
      const result = await runDeployCmd(['-x', manifest, '--json', '-u', testOrg.username], { sourceApiVersion });
      expect(result).to.deep.equal(expectedResults);
      ensureCreateComponentSetArgs({
        sourceapiversion: sourceApiVersion,
        manifest: {
          manifestPath: manifest,
          directoryPaths: [defaultDir],
          destructiveChangesPost: undefined,
          destructiveChangesPre: undefined,
        },
      });
      ensureDeployArgs();
      ensureHookArgs();
      ensureProgressBar(0);
    });

    it('should pass along --targetusername', async () => {
      const sourceApiVersion = '50.0';
      resolveProjectConfigStub.resolves({ sourceApiVersion });
      const manifest = 'package.xml';
      const result = await runDeployCmd(['-x', manifest, '--json', '--targetusername', testOrg.username], {
        sourceApiVersion,
      });
      expect(result).to.deep.equal(expectedResults);
      ensureCreateComponentSetArgs({
        sourceapiversion: sourceApiVersion,
        manifest: {
          manifestPath: manifest,
          directoryPaths: [defaultDir],
          destructiveChangesPost: undefined,
          destructiveChangesPre: undefined,
        },
      });
      ensureDeployArgs();
      ensureHookArgs();
      ensureProgressBar(0);
    });

    it('should pass along --targetusername with -o', async () => {
      const sourceApiVersion = '50.0';
      resolveProjectConfigStub.resolves({ sourceApiVersion });
      const manifest = 'package.xml';
      const result = await runDeployCmd(['-x', manifest, '--json', '-o', '--targetusername', testOrg.username], {
        sourceApiVersion,
      });
      expect(result).to.deep.equal(expectedResults);
      ensureCreateComponentSetArgs({
        sourceapiversion: sourceApiVersion,
        manifest: {
          manifestPath: manifest,
          directoryPaths: [defaultDir],
          destructiveChangesPost: undefined,
          destructiveChangesPre: undefined,
        },
      });
      ensureDeployArgs({ apiOptions: { rollbackOnError: false } });
      ensureHookArgs();
      ensureProgressBar(0);
    });

    it('should pass along --target-org with -o', async () => {
      const sourceApiVersion = '50.0';
      resolveProjectConfigStub.resolves({ sourceApiVersion });
      const manifest = 'package.xml';
      const result = await runDeployCmd(['-x', manifest, '--json', '-o', '--target-org', testOrg.username], {
        sourceApiVersion,
      });
      expect(result).to.deep.equal(expectedResults);
      ensureCreateComponentSetArgs({
        sourceapiversion: sourceApiVersion,
        manifest: {
          manifestPath: manifest,
          directoryPaths: [defaultDir],
          destructiveChangesPost: undefined,
          destructiveChangesPre: undefined,
        },
      });
      ensureDeployArgs({ apiOptions: { rollbackOnError: false } });
      ensureHookArgs();
      ensureProgressBar(0);
    });
    it('should pass along -u with -o', async () => {
      const sourceApiVersion = '50.0';
      resolveProjectConfigStub.resolves({ sourceApiVersion });
      const manifest = 'package.xml';
      const result = await runDeployCmd(['-x', manifest, '--json', '-o', '-u', testOrg.username], {
        sourceApiVersion,
      });
      expect(result).to.deep.equal(expectedResults);
      ensureCreateComponentSetArgs({
        sourceapiversion: sourceApiVersion,
        manifest: {
          manifestPath: manifest,
          directoryPaths: [defaultDir],
          destructiveChangesPost: undefined,
          destructiveChangesPre: undefined,
        },
      });
      ensureDeployArgs({ apiOptions: { rollbackOnError: false } });
      ensureHookArgs();
      ensureProgressBar(0);
    });

    it('should pass purgeOnDelete flag', async () => {
      const manifest = 'package.xml';
      const destructiveChanges = 'destructiveChangesPost.xml';
      const runTests = ['MyClassTest'];
      const testLevel = 'RunSpecifiedTests';
      const result = await runDeployCmd([
        `-x=${manifest}`,
        `--postdestructivechanges=${destructiveChanges}`,
        '-g',
        '-o',
        '-c',
        `-r=${runTests[0]}`,
        `-l=${testLevel}`,
        '--purgeondelete',
        '--json',
      ]);

      expect(result).to.deep.equal(expectedResults);
      ensureDeployArgs({
        apiOptions: {
          checkOnly: true,
          ignoreWarnings: true,
          purgeOnDelete: true,
          rest: false,
          rollbackOnError: false,
          runTests,
          testLevel,
        },
      });
      ensureCreateComponentSetArgs({
        manifest: {
          manifestPath: manifest,
          directoryPaths: [defaultDir],
          destructiveChangesPost: destructiveChanges,
          destructiveChangesPre: undefined,
        },
      });
      ensureHookArgs();
      ensureProgressBar(0);
    });

    it('should pass default purgeondelete flag to false', async () => {
      const manifest = 'package.xml';
      const destructiveChanges = 'destructiveChangesPost.xml';
      const runTests = ['MyClassTest'];
      const testLevel = 'RunSpecifiedTests';
      const result = await runDeployCmd([
        `-x=${manifest}`,
        `--postdestructivechanges=${destructiveChanges}`,
        '-g',
        '-o',
        '-c',
        `-r=${runTests[0]}`,
        `-l=${testLevel}`,
        '--json',
      ]);

      expect(result).to.deep.equal(expectedResults);
      ensureDeployArgs({
        apiOptions: {
          checkOnly: true,
          ignoreWarnings: true,
          purgeOnDelete: false,
          rest: false,
          rollbackOnError: false,
          runTests,
          testLevel,
        },
      });
      ensureCreateComponentSetArgs({
        manifest: {
          manifestPath: manifest,
          directoryPaths: [defaultDir],
          destructiveChangesPost: destructiveChanges,
          destructiveChangesPre: undefined,
        },
      });
      ensureHookArgs();
      ensureProgressBar(0);
    });

    it('should pass along all deploy options', async () => {
      const manifest = 'package.xml';
      const runTests = ['MyClassTest'];
      const testLevel = 'RunSpecifiedTests';
      const result = await runDeployCmd([
        `-x=${manifest}`,
        '-g',
        '-o',
        '-c',
        `-r=${runTests[0]}`,
        `-l=${testLevel}`,
        '--json',
      ]);

      expect(result).to.deep.equal(expectedResults);
      ensureCreateComponentSetArgs({
        manifest: {
          manifestPath: manifest,
          directoryPaths: [defaultDir],
          destructiveChangesPost: undefined,
          destructiveChangesPre: undefined,
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
      it('should use SOAP by default', () => {
        const sourcepath = ['somepath'];
        const cmd = new TestDeploy(['-p', sourcepath[0]], oclifConfigStub);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore private method
        expect(cmd.isRest).to.be.false;
      });

      it('should use SOAP from the env var', () => {
        process.env.SFDX_REST_DEPLOY = 'false';
        const sourcepath = ['somepath'];
        const cmd = new TestDeploy(['-p', sourcepath[0]], oclifConfigStub);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore private method
        expect(cmd.isRest).to.be.false;
      });

      it('should use REST from the env var', () => {
        process.env.SFDX_REST_DEPLOY = 'true';
        const sourcepath = ['somepath'];
        const cmd = new TestDeploy(['-p', sourcepath[0]], oclifConfigStub);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore private method
        expect(cmd.isRest).to.be.false;
      });

      it('should use SOAP by overriding env var with flag', () => {
        process.env.SFDX_REST_DEPLOY = 'true';
        const sourcepath = ['somepath'];
        const cmd = new TestDeploy(['-p', sourcepath[0], '--soapdeploy'], oclifConfigStub);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore private method
        expect(cmd.isRest).to.be.false;
      });

      it('should use SOAP from flag', () => {
        const sourcepath = ['somepath'];
        const cmd = new TestDeploy(['-p', sourcepath[0], '--soapdeploy'], oclifConfigStub);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore private method
        expect(cmd.isRest).to.be.false;
      });

      it('should use SOAP from config', () => {
        stubMethod(sandbox, ConfigAggregator, 'create').resolves(ConfigAggregator.prototype);
        stubMethod(sandbox, ConfigAggregator.prototype, 'getPropertyValue').returns('false');
        const sourcepath = ['somepath'];
        const cmd = new TestDeploy(['-p', sourcepath[0], '--soapdeploy'], oclifConfigStub);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore private method
        expect(cmd.isRest).to.be.false;
      });

      it('should use SOAP by overriding env var with config', () => {
        process.env.SFDX_REST_DEPLOY = 'true';
        stubMethod(sandbox, ConfigAggregator, 'create').resolves(ConfigAggregator.prototype);
        stubMethod(sandbox, ConfigAggregator.prototype, 'getPropertyValue').returns('false');
        const sourcepath = ['somepath'];
        const cmd = new TestDeploy(['-p', sourcepath[0], '--soapdeploy'], oclifConfigStub);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore private method
        expect(cmd.isRest).to.be.false;
      });
    });

    describe('Hooks', () => {
      it('should emit postdeploy hooks for validateddeployrequestid deploys', async () => {
        await runDeployCmd(['-q', '0Af0x00000pkAXLCA2']);
        expect(lifecycleEmitStub.firstCall.args[0]).to.equal('postdeploy');
      });

      it('should emit predeploy hooks for async deploys', async () => {
        const sourcepath = ['somepath'];
        await runDeployCmd(['-p', sourcepath[0], '-w', '0']);
        expect(lifecycleEmitStub.firstCall.args[0]).to.equal('predeploy');
      });
    });

    describe('Progress Bar', () => {
      it('should NOT call progress bar because of environment variable', async () => {
        process.env.SF_USE_PROGRESS_BAR = 'false';
        const sourcepath = ['somepath'];
        const result = await runDeployCmd(['-p', sourcepath[0]]);
        expect(result).to.deep.equal(expectedResults);
        ensureCreateComponentSetArgs({ sourcepath });
        ensureDeployArgs();
        ensureHookArgs();
        expect(progressStatusStub.calledOnce).to.be.true;
        expect(progressBarStub.calledOnce).to.be.false;
      });

      it('should call progress bar', async () => {
        const sourcepath = ['somepath'];
        const result = await runDeployCmd(['-p', sourcepath[0]]);
        expect(result).to.deep.equal(expectedResults);
        ensureCreateComponentSetArgs({ sourcepath });
        ensureDeployArgs();
        ensureHookArgs();
        expect(progressStatusStub.calledOnce).to.be.false;
        expect(progressBarStub.calledOnce).to.be.true;
      });

      it('should NOT call progress bar because of --json', async () => {
        const sourcepath = ['somepath'];
        const result = await runDeployCmd(['--json', '-p', sourcepath[0]]);
        expect(result).to.deep.equal(expectedResults);
        ensureCreateComponentSetArgs({ sourcepath });
        ensureDeployArgs();
        ensureHookArgs();
        ensureProgressBar(0);
      });
    });

    it('should return JSON format and not display for a synchronous deploy', async () => {
      const result = await runDeployCmd(['-p', 'somepath', '--json']);
      expect(formatterDisplayStub.calledOnce).to.equal(false);
      expect(result).to.deep.equal(expectedResults);
    });

    it('should return JSON format and not display for an asynchronous deploy', async () => {
      const formatterAsyncDisplayStub = stubMethod(sandbox, DeployAsyncResultFormatter.prototype, 'display');
      const result = await runDeployCmd(['-p', 'somepath', '--json', '-w', '0']);
      expect(formatterAsyncDisplayStub.calledOnce).to.equal(false);
      expect(result).to.deep.equal(expectedAsyncResults);
    });

    it('should return JSON format and display for a synchronous deploy', async () => {
      const result = await runDeployCmd(['-p', 'somepath']);
      expect(formatterDisplayStub.calledOnce).to.equal(true);
      expect(result).to.deep.equal(expectedResults);
    });

    it('should return JSON format and display for an asynchronous deploy', async () => {
      const formatterAsyncDisplayStub = stubMethod(sandbox, DeployAsyncResultFormatter.prototype, 'display');
      const result = await runDeployCmd(['-p', 'somepath', '-w', '0']);
      expect(formatterAsyncDisplayStub.calledOnce).to.equal(true);
      expect(result).to.deep.equal(expectedAsyncResults);
    });
  });
});

/** when envVars is loading stuff, it copies deprecated envs.  So when you clear them, you have to clear both versions of each env */
const resetEnv = () => {
  delete process.env.SFDX_REST_DEPLOY;
  delete process.env.SF_ORG_METADATA_REST_DEPLOY;
  delete process.env.SFDX_USE_PROGRESS_BAR;
  delete process.env.SF_USE_PROGRESS_BAR;
};
