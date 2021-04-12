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
import { ComponentSet, DeployResult, FromSourceOptions } from '@salesforce/source-deploy-retrieve';
import { stubMethod } from '@salesforce/ts-sinon';
import { fs as fsCore, SfdxError, SfdxProject } from '@salesforce/core';
import cli from 'cli-ux';
import { FlagOptions, ProgressBar, SourceCommand } from '../../../src/sourceCommand';
import { deployReport } from './deployReport';

describe('SourceCommand', () => {
  const sandbox = sinon.createSandbox();

  class SourceCommandTest extends SourceCommand {
    public callDeployProgress(id?: string): Promise<DeployResult> {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-return
      return this.deployReport(id);
    }
    public async run() {}
    public async callCreateComponentSet(options: FlagOptions): Promise<ComponentSet> {
      return this.createComponentSet(options);
    }
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
      fromManifestStub = stubMethod(sandbox, ComponentSet, 'fromManifestFile');
      getUniquePackageDirectoriesStub = stubMethod(sandbox, SfdxProject.prototype, 'getUniquePackageDirectories');
      componentSet = new ComponentSet();
    });

    afterEach(() => {
      sandbox.restore();
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
      expect(fromSourceArgs).to.have.deep.property('inclusiveFilter', filter);
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
      expect(fromSourceArgs).to.have.deep.property('inclusiveFilter', filter);
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
      expect(fromSourceArgs).to.have.deep.property('inclusiveFilter', filter);
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
      expect(fromSourceArgs).to.have.deep.property('inclusiveFilter', filter);
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
      expect(fromManifestStub.firstCall.args[0]).to.equal(options.manifest);
      expect(fromManifestStub.firstCall.args[1]).to.deep.equal({ resolve: packageDir1 });
      expect(compSet.size).to.equal(1);
      expect(compSet.has(apexClassComponent)).to.equal(true);
    });

    it('should create ComponentSet from manifest and multiple package', async () => {
      componentSet.add(apexClassComponent);
      const componentSet2 = new ComponentSet();
      const apexClassComponent2 = { type: 'ApexClass', fullName: 'MyClass2' };
      componentSet2.add(apexClassComponent2);
      fromManifestStub.onFirstCall().resolves(componentSet);
      fromManifestStub.onSecondCall().resolves(componentSet2);
      const packageDir1 = path.resolve('force-app');
      const packageDir2 = path.resolve('my-app');
      getUniquePackageDirectoriesStub.returns([{ fullPath: packageDir1 }, { fullPath: packageDir2 }]);
      const options = {
        sourcepath: undefined,
        manifest: 'apex-package.xml',
        metadata: undefined,
      };

      const compSet = await command.callCreateComponentSet(options);
      expect(fromManifestStub.callCount).to.equal(2);
      expect(fromManifestStub.firstCall.args[0]).to.equal(options.manifest);
      expect(fromManifestStub.firstCall.args[1]).to.deep.equal({ resolve: packageDir1 });
      expect(fromManifestStub.secondCall.args[0]).to.equal(options.manifest);
      expect(fromManifestStub.secondCall.args[1]).to.deep.equal({ resolve: packageDir2 });
      expect(compSet.size).to.equal(2);
      expect(compSet.has(apexClassComponent)).to.equal(true);
      expect(compSet.has(apexClassComponent2)).to.equal(true);
    });
  });

  describe('deployReport', () => {
    const pb: ProgressBar = cli.progress({
      format: 'SOURCE PROGRESS | {bar} | {value}/{total} Components',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      linewrap: true,
    }) as ProgressBar;
    let pbStart: sinon.SinonStub;
    let pbStop: sinon.SinonStub;
    let pbUpdate: sinon.SinonStub;
    let initProgressBarStub: sinon.SinonStub;

    const command: SourceCommandTest = new SourceCommandTest([''], null);

    // @ts-ignore
    command.ux = { log: () => {} };
    // @ts-ignore
    command.org = {
      // @ts-ignore
      getConnection: () => {
        return {
          metadata: {
            checkDeployStatus: () => deployReport,
          },
        };
      },
    };
    // @ts-ignore
    command.flags = [];

    beforeEach(() => {
      initProgressBarStub = sandbox.stub(command, 'initProgressBar').callsFake(() => {
        command.progressBar = pb;
      });
      pbStart = sandbox.stub(pb, 'start');
      pbUpdate = sandbox.stub(pb, 'update');
      pbStop = sandbox.stub(pb, 'stop');
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should "print" the progress bar', async () => {
      const res = await command.callDeployProgress('0Af1h00000fCQgsCAG');
      expect(res).to.deep.equal(deployReport);
      expect(initProgressBarStub.called).to.be.true;
      expect(pbStart.callCount).to.equal(1);
      expect(pbStop.callCount).to.equal(1);
      expect(pbUpdate.callCount).to.equal(1);
    });

    it('should NOT "print" the progress bar because of --json', async () => {
      // @ts-ignore
      command.flags.json = true;
      expect(initProgressBarStub.called).to.be.false;

      const res = await command.callDeployProgress('0Af1h00000fCQgsCAG');
      expect(res).to.deep.equal(deployReport);
    });

    it('should NOT "print" the progress bar because of env var', async () => {
      try {
        process.env.SFDX_USE_PROGRESS_BAR = 'false';
        const res = await command.callDeployProgress('0Af1h00000fCQgsCAG');
        expect(initProgressBarStub.called).to.be.false;

        expect(res).to.deep.equal(deployReport);
      } finally {
        delete process.env.SFDX_USE_PROGRESS_BAR;
      }
    });
  });
});
