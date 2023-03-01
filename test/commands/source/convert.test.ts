/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { join, resolve } from 'path';
import { ComponentSetBuilder, ComponentSetOptions, MetadataConverter } from '@salesforce/source-deploy-retrieve';
import * as sinon from 'sinon';
import { expect } from 'chai';
import { fromStub, stubInterface, stubMethod } from '@salesforce/ts-sinon';
import { Config } from '@oclif/core';
import { SfProject } from '@salesforce/core';
import { MockTestOrgData, TestContext } from '@salesforce/core/lib/testSetup';
import { Convert } from '../../../src/commands/force/source/convert';

describe('force:source:convert', () => {
  const $$ = new TestContext();
  const testOrg = new MockTestOrgData();
  const sandbox = sinon.createSandbox();

  let buildComponentSetStub: sinon.SinonStub;

  const defaultDir = join('my', 'default', 'package');
  const myApp = join('new', 'package', 'directory');
  const packageXml = 'package.xml';
  const oclifConfigStub = fromStub(stubInterface<Config>(sandbox));
  let resolveProjectConfigStub: sinon.SinonStub;

  class TestConvert extends Convert {
    public async runIt() {
      await this.init();
      return this.run();
    }
  }

  const runConvertCmd = async (params: string[], options?: { sourceApiVersion?: string }) => {
    const cmd = new TestConvert(params, oclifConfigStub);
    cmd.project = SfProject.getInstance();
    sandbox.stub(cmd.project, 'getDefaultPackage').returns({ name: '', path: defaultDir, fullPath: defaultDir });
    sandbox.stub(cmd.project, 'getUniquePackageDirectories').returns([{ fullPath: defaultDir, path: '', name: '' }]);
    sandbox.stub(cmd.project, 'getPackageDirectories').returns([{ fullPath: defaultDir, path: '', name: '' }]);
    sandbox.stub(cmd.project, 'resolveProjectConfig').resolves({ sourceApiVersion: options?.sourceApiVersion });

    return cmd.runIt();
  };

  // Ensure correct ComponentSetBuilder options
  const ensureCreateComponentSetArgs = (overrides?: Partial<ComponentSetOptions>) => {
    const defaultArgs = {
      sourcepath: [],
      manifest: undefined,
      metadata: undefined,
      sourceapiversion: undefined,
    };
    const expectedArgs = { ...defaultArgs, ...overrides };

    expect(buildComponentSetStub.calledOnce).to.equal(true);
    expect(buildComponentSetStub.firstCall.args[0]).to.deep.equal(expectedArgs);
  };

  beforeEach(async () => {
    await $$.stubAuths(testOrg);
    resolveProjectConfigStub = sandbox.stub();
    sandbox.stub(MetadataConverter.prototype, 'convert').resolves({ packagePath: 'temp' });
    buildComponentSetStub = stubMethod(sandbox, ComponentSetBuilder, 'build').resolves({
      deploy: sinon.stub(),
      getPackageXml: () => packageXml,
    });
  });

  afterEach(() => {
    $$.restore();
    sandbox.restore();
  });

  it('should pass along sourcepath', async () => {
    const sourcepath = 'somepath';
    const result = await runConvertCmd(['--sourcepath', sourcepath, '--json']);
    expect(result).to.deep.equal({ location: resolve('temp') });
    ensureCreateComponentSetArgs({ sourcepath: [sourcepath] });
  });

  it('should pass along sourceApiVersion', async () => {
    const sourceApiVersion = '50.0';
    resolveProjectConfigStub.resolves({ sourceApiVersion });
    const result = await runConvertCmd(['--json'], { sourceApiVersion });
    expect(result).to.deep.equal({ location: resolve('temp') });
    ensureCreateComponentSetArgs({
      sourcepath: [defaultDir],
      sourceapiversion: sourceApiVersion,
    });
  });

  it('should call default package dir if no args', async () => {
    const result = await runConvertCmd(['--json']);
    expect(result).to.deep.equal({ location: resolve('temp') });
    ensureCreateComponentSetArgs({ sourcepath: [defaultDir] });
  });

  it('should call with metadata', async () => {
    const metadata = 'ApexClass';
    const result = await runConvertCmd(['--metadata', metadata, '--json']);
    expect(result).to.deep.equal({ location: resolve('temp') });
    ensureCreateComponentSetArgs({
      metadata: {
        metadataEntries: [metadata],
        directoryPaths: [defaultDir],
      },
    });
  });

  it('should call with package.xml', async () => {
    const result = await runConvertCmd(['--manifest', packageXml, '--json']);
    expect(result).to.deep.equal({ location: resolve('temp') });
    ensureCreateComponentSetArgs({
      manifest: {
        manifestPath: packageXml,
        directoryPaths: [defaultDir],
      },
    });
  });

  it('should call root dir with rootdir flag', async () => {
    const result = await runConvertCmd(['--rootdir', myApp, '--json']);
    expect(result).to.deep.equal({ location: resolve('temp') });
    ensureCreateComponentSetArgs({ sourcepath: [myApp] });
  });

  describe('rootdir should be overwritten by any other flag', () => {
    it('sourcepath', async () => {
      const result = await runConvertCmd(['--rootdir', myApp, '--sourcepath', defaultDir, '--json']);
      expect(result).to.deep.equal({ location: resolve('temp') });
      ensureCreateComponentSetArgs({ sourcepath: [defaultDir] });
    });

    it('metadata', async () => {
      const metadata = 'ApexClass,CustomObject';
      const result = await runConvertCmd(['--rootdir', myApp, '--metadata', metadata, '--json']);
      expect(result).to.deep.equal({ location: resolve('temp') });
      ensureCreateComponentSetArgs({
        metadata: {
          metadataEntries: metadata.split(','),
          directoryPaths: [defaultDir],
        },
      });
    });

    it('package', async () => {
      const result = await runConvertCmd(['--rootdir', myApp, '--manifest', packageXml, '--json']);
      expect(result).to.deep.equal({ location: resolve('temp') });
      ensureCreateComponentSetArgs({
        manifest: {
          manifestPath: packageXml,
          directoryPaths: [defaultDir],
        },
      });
    });
  });
});
