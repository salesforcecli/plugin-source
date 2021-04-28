/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/* eslint-disable @typescript-eslint/ban-ts-comment */

import * as path from 'path';
import * as sinon from 'sinon';
import { assert, expect } from 'chai';
import { ComponentSet, FromSourceOptions } from '@salesforce/source-deploy-retrieve';
import { stubInterface, stubMethod, fromStub } from '@salesforce/ts-sinon';
import { Dictionary } from '@salesforce/ts-types';
import { fs as fsCore, SfdxError, SfdxProject, Logger } from '@salesforce/core';
import { FlagOptions, SourceCommand } from '../../../src/sourceCommand';

describe('SourceCommand', () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  class SourceCommandTest extends SourceCommand {
    protected logger = fromStub(
      stubInterface<Logger>(sandbox, {
        debug: () => {},
        isDebugEnabled: () => false,
      })
    );
    public async run() {}
    public async callCreateComponentSet(options: FlagOptions): Promise<ComponentSet> {
      return this.createComponentSet(options);
    }
    public callSetExitCode(exitCode: number) {
      this.setExitCode(exitCode);
    }
    public setCmdFlags(flags: Dictionary) {
      this.flags = flags;
    }
    public resolveSuccess() {}
    public formatResult() {}
  }

  const apexClassComponent = {
    type: 'ApexClass',
    fullName: 'MyClass',
    content: 'MyClass.cls',
    xml: 'MyClass.cls-meta.xml',
  };
  const customObjectComponent = {
    type: 'CustomObject',
    fullName: 'MyCustomObject__c',
    content: undefined,
    xml: 'MyCustomObject__c.object-meta.xml',
  };

  describe('isJsonOutput', () => {
    it('should return true when json flag is set', () => {
      const command = new SourceCommandTest([''], null);
      command.setCmdFlags({ json: true });
      expect(command.isJsonOutput()).to.equal(true);
    });

    it('should return false when json flag is unset', () => {
      const command = new SourceCommandTest([''], null);
      expect(command.isJsonOutput()).to.equal(false);
    });
  });

  describe('setExitCode', () => {
    const exitCode = process.exitCode;
    it('should set process.exitCode', () => {
      const testCode = 100;
      const command = new SourceCommandTest([''], null);
      command.callSetExitCode(testCode);
      expect(process.exitCode).to.equal(testCode);
    });

    after(() => {
      process.exitCode = exitCode;
    });
  });

  describe('createComponentSet', () => {
    const command = new SourceCommandTest([''], null);
    const projectPath = 'stubbedProjectPath';
    stubMethod(sandbox, SfdxProject, 'resolveProjectPathSync').returns(projectPath);
    // @ts-ignore assigning to a protected member
    command.project = SfdxProject.getInstance(projectPath);

    let componentSet: ComponentSet;

    let fileExistsSyncStub: sinon.SinonStub;
    let fromSourceStub: sinon.SinonStub;
    let fromManifestStub: sinon.SinonStub;
    let getUniquePackageDirectoriesStub: sinon.SinonStub;

    beforeEach(() => {
      fileExistsSyncStub = stubMethod(sandbox, fsCore, 'fileExistsSync');
      fromSourceStub = stubMethod(sandbox, ComponentSet, 'fromSource');
      fromManifestStub = stubMethod(sandbox, ComponentSet, 'fromManifest');
      getUniquePackageDirectoriesStub = stubMethod(sandbox, SfdxProject.prototype, 'getUniquePackageDirectories');
      componentSet = new ComponentSet();
    });

    it('should create ComponentSet from single sourcepath', async () => {
      fileExistsSyncStub.returns(true);
      componentSet.add(apexClassComponent);
      fromSourceStub.returns(componentSet);
      const sourcepath = ['force-app'];
      const options = {
        sourcepath,
        manifest: undefined,
        metadata: undefined,
      };

      const compSet = await command.callCreateComponentSet(options);
      const expectedPath = path.resolve(sourcepath[0]);
      expect(fromSourceStub.calledOnceWith(expectedPath)).to.equal(true);
      expect(compSet.size).to.equal(1);
      expect(compSet.has(apexClassComponent)).to.equal(true);
    });

    it('should create ComponentSet from multiple sourcepaths', async () => {
      fileExistsSyncStub.returns(true);
      componentSet.add(apexClassComponent);
      componentSet.add(customObjectComponent);
      fromSourceStub.returns(componentSet);
      const sourcepath = ['force-app', 'my-app'];
      const options = {
        sourcepath,
        manifest: undefined,
        metadata: undefined,
      };

      const compSet = await command.callCreateComponentSet(options);
      const expectedPath1 = path.resolve(sourcepath[0]);
      const expectedPath2 = path.resolve(sourcepath[1]);
      expect(fromSourceStub.calledTwice).to.equal(true);
      expect(fromSourceStub.firstCall.args[0]).to.equal(expectedPath1);
      expect(fromSourceStub.secondCall.args[0]).to.equal(expectedPath2);
      expect(compSet.size).to.equal(2);
      expect(compSet.has(apexClassComponent)).to.equal(true);
      expect(compSet.has(customObjectComponent)).to.equal(true);
    });

    it('should create ComponentSet with overridden apiVersion', async () => {
      fileExistsSyncStub.returns(true);
      fromSourceStub.returns(componentSet);
      const sourcepath = ['force-app'];
      const options = {
        sourcepath,
        manifest: undefined,
        metadata: undefined,
        apiversion: '50.0',
      };

      const compSet = await command.callCreateComponentSet(options);
      const expectedPath = path.resolve(sourcepath[0]);
      expect(fromSourceStub.calledOnceWith(expectedPath)).to.equal(true);
      expect(compSet.size).to.equal(0);
      expect(compSet.apiVersion).to.equal(options.apiversion);
    });

    it('should throw with an invalid sourcepath', async () => {
      fileExistsSyncStub.returns(false);
      const sourcepath = ['nonexistent'];
      try {
        await command.callCreateComponentSet({
          sourcepath,
          manifest: undefined,
          metadata: undefined,
        });
        assert(false, 'should have thrown SfdxError');
      } catch (e: unknown) {
        const err = e as SfdxError;
        expect(fromSourceStub.notCalled).to.equal(true);
        expect(err.message).to.include(sourcepath[0]);
      }
    });

    it('should create empty ComponentSet from packagenames', async () => {
      fileExistsSyncStub.returns(true);
      const options = {
        sourcepath: undefined,
        manifest: undefined,
        metadata: undefined,
        packagenames: ['mypackage'],
      };

      const compSet = await command.callCreateComponentSet(options);
      expect(compSet.size).to.equal(0);
      expect(fromSourceStub.notCalled).to.equal(true);
      expect(fromManifestStub.notCalled).to.equal(true);
      expect(getUniquePackageDirectoriesStub.notCalled).to.equal(true);
    });

    it('should create ComponentSet from wildcarded metadata (ApexClass)', async () => {
      componentSet.add(apexClassComponent);
      fromSourceStub.returns(componentSet);
      const packageDir1 = path.resolve('force-app');
      getUniquePackageDirectoriesStub.returns([{ fullPath: packageDir1 }]);
      const options = {
        sourcepath: undefined,
        manifest: undefined,
        metadata: ['ApexClass'],
      };

      const compSet = await command.callCreateComponentSet(options);
      expect(fromSourceStub.calledOnce).to.equal(true);
      const fromSourceArgs = fromSourceStub.firstCall.args[0] as FromSourceOptions;
      expect(fromSourceArgs).to.have.deep.property('fsPaths', [packageDir1]);
      const filter = new ComponentSet();
      filter.add({ type: 'ApexClass', fullName: '*' });
      expect(fromSourceArgs).to.have.deep.property('include', filter);
      expect(compSet.size).to.equal(1);
      expect(compSet.has(apexClassComponent)).to.equal(true);
    });

    it('should create ComponentSet from specific metadata (ApexClass:MyClass)', async () => {
      componentSet.add(apexClassComponent);
      fromSourceStub.returns(componentSet);
      const packageDir1 = path.resolve('force-app');
      getUniquePackageDirectoriesStub.returns([{ fullPath: packageDir1 }]);
      const options = {
        sourcepath: undefined,
        manifest: undefined,
        metadata: ['ApexClass:MyClass'],
      };

      const compSet = await command.callCreateComponentSet(options);
      expect(fromSourceStub.calledOnce).to.equal(true);
      const fromSourceArgs = fromSourceStub.firstCall.args[0] as FromSourceOptions;
      expect(fromSourceArgs).to.have.deep.property('fsPaths', [packageDir1]);
      const filter = new ComponentSet();
      filter.add({ type: 'ApexClass', fullName: 'MyClass' });
      expect(fromSourceArgs).to.have.deep.property('include', filter);
      expect(compSet.size).to.equal(1);
      expect(compSet.has(apexClassComponent)).to.equal(true);
    });

    it('should create ComponentSet from multiple metadata (ApexClass:MyClass,CustomObject)', async () => {
      componentSet.add(apexClassComponent);
      componentSet.add(customObjectComponent);
      fromSourceStub.returns(componentSet);
      const packageDir1 = path.resolve('force-app');
      getUniquePackageDirectoriesStub.returns([{ fullPath: packageDir1 }]);
      const options = {
        sourcepath: undefined,
        manifest: undefined,
        metadata: ['ApexClass:MyClass', 'CustomObject'],
      };

      const compSet = await command.callCreateComponentSet(options);
      expect(fromSourceStub.calledOnce).to.equal(true);
      const fromSourceArgs = fromSourceStub.firstCall.args[0] as FromSourceOptions;
      expect(fromSourceArgs).to.have.deep.property('fsPaths', [packageDir1]);
      const filter = new ComponentSet();
      filter.add({ type: 'ApexClass', fullName: 'MyClass' });
      filter.add({ type: 'CustomObject', fullName: '*' });
      expect(fromSourceArgs).to.have.deep.property('include', filter);
      expect(compSet.size).to.equal(2);
      expect(compSet.has(apexClassComponent)).to.equal(true);
      expect(compSet.has(customObjectComponent)).to.equal(true);
    });

    it('should create ComponentSet from metadata and multiple package directories', async () => {
      componentSet.add(apexClassComponent);
      const apexClassComponent2 = { type: 'ApexClass', fullName: 'MyClass2' };
      componentSet.add(apexClassComponent2);
      fromSourceStub.returns(componentSet);
      const packageDir1 = path.resolve('force-app');
      const packageDir2 = path.resolve('my-app');
      getUniquePackageDirectoriesStub.returns([{ fullPath: packageDir1 }, { fullPath: packageDir2 }]);
      const options = {
        sourcepath: undefined,
        manifest: undefined,
        metadata: ['ApexClass'],
      };

      const compSet = await command.callCreateComponentSet(options);
      expect(fromSourceStub.calledOnce).to.equal(true);
      const fromSourceArgs = fromSourceStub.firstCall.args[0] as FromSourceOptions;
      expect(fromSourceArgs).to.have.deep.property('fsPaths', [packageDir1, packageDir2]);
      const filter = new ComponentSet();
      filter.add({ type: 'ApexClass', fullName: '*' });
      expect(fromSourceArgs).to.have.deep.property('include', filter);
      expect(compSet.size).to.equal(2);
      expect(compSet.has(apexClassComponent)).to.equal(true);
      expect(compSet.has(apexClassComponent2)).to.equal(true);
    });

    it('should create ComponentSet from manifest', async () => {
      componentSet.add(apexClassComponent);
      fromManifestStub.resolves(componentSet);
      const packageDir1 = path.resolve('force-app');
      getUniquePackageDirectoriesStub.returns([{ fullPath: packageDir1 }]);
      const options = {
        sourcepath: undefined,
        manifest: 'apex-package.xml',
        metadata: undefined,
      };

      const compSet = await command.callCreateComponentSet(options);
      expect(fromManifestStub.calledOnce).to.equal(true);
      expect(fromManifestStub.firstCall.args[0]).to.deep.equal({
        manifestPath: options.manifest,
        resolveSourcePaths: [packageDir1],
      });
      expect(compSet.size).to.equal(1);
      expect(compSet.has(apexClassComponent)).to.equal(true);
    });

    it('should create ComponentSet from manifest and multiple package', async () => {
      componentSet.add(apexClassComponent);
      const apexClassComponent2 = { type: 'ApexClass', fullName: 'MyClass2' };
      componentSet.add(apexClassComponent2);
      fromManifestStub.onFirstCall().resolves(componentSet);
      const packageDir1 = path.resolve('force-app');
      const packageDir2 = path.resolve('my-app');
      getUniquePackageDirectoriesStub.returns([{ fullPath: packageDir1 }, { fullPath: packageDir2 }]);
      const options = {
        sourcepath: undefined,
        manifest: 'apex-package.xml',
        metadata: undefined,
      };

      const compSet = await command.callCreateComponentSet(options);
      expect(fromManifestStub.callCount).to.equal(1);
      expect(fromManifestStub.firstCall.args[0]).to.deep.equal({
        manifestPath: options.manifest,
        resolveSourcePaths: [packageDir1, packageDir2],
      });
      expect(compSet.size).to.equal(2);
      expect(compSet.has(apexClassComponent)).to.equal(true);
      expect(compSet.has(apexClassComponent2)).to.equal(true);
    });
  });
});
