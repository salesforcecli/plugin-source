/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as fs from 'fs';
import { join } from 'path';
import * as sinon from 'sinon';
import { expect } from 'chai';
import {
  ComponentSet,
  ComponentSetBuilder,
  ComponentSetOptions,
  SourceComponent,
} from '@salesforce/source-deploy-retrieve';
import { Lifecycle, Org, SfProject } from '@salesforce/core';
import { fromStub, stubInterface, stubMethod } from '@salesforce/ts-sinon';
import { Config } from '@oclif/core';
import { UX } from '@salesforce/command';
import { Delete } from '../../../src/commands/force/source/delete';
import { exampleDeleteResponse, exampleSourceComponent } from './testConsts';

const fsPromises = fs.promises;

describe('force:source:delete', () => {
  const sandbox = sinon.createSandbox();
  const username = 'delete-test@org.com';
  const defaultPackagePath = 'defaultPackagePath';
  let confirm = true;

  const oclifConfigStub = fromStub(stubInterface<Config>(sandbox));

  // Stubs
  let buildComponentSetStub: sinon.SinonStub;
  let lifecycleEmitStub: sinon.SinonStub;
  let resolveProjectConfigStub: sinon.SinonStub;
  let fsUnlink: sinon.SinonStub;
  let moveToStashStub: sinon.SinonStub;
  let restoreFromStashStub: sinon.SinonStub;
  let deleteStashStub: sinon.SinonStub;

  class TestDelete extends Delete {
    public async runIt() {
      await this.init();
      // oclif would normally populate this, but UT don't have it
      this.id ??= 'force:source:delete';
      return this.run();
    }
    public setOrg(org: Org) {
      this.org = org;
    }
    public setProject(project: SfProject) {
      this.project = project;
    }
  }

  const runDeleteCmd = async (params: string[]) => {
    const cmd = new TestDelete(params, oclifConfigStub);
    stubMethod(sandbox, SfProject, 'resolveProjectPath').resolves(join('path', 'to', 'package'));
    stubMethod(sandbox, cmd, 'assignProject').callsFake(() => {
      const SfProjectStub = fromStub(
        stubInterface<SfProject>(sandbox, {
          getDefaultPackage: () => ({ fullPath: defaultPackagePath }),
          getUniquePackageDirectories: () => [{ fullPath: defaultPackagePath }],
          resolveProjectConfig: resolveProjectConfigStub,
        })
      );
      cmd.setProject(SfProjectStub);
    });
    stubMethod(sandbox, cmd, 'assignOrg').callsFake(() => {
      const orgStub = fromStub(
        stubInterface<Org>(sandbox, {
          getUsername: () => username,
        })
      );
      cmd.setOrg(orgStub);
    });
    stubMethod(sandbox, UX.prototype, 'log');
    stubMethod(sandbox, ComponentSet.prototype, 'deploy').resolves({
      id: '123',
      pollStatus: () => exampleDeleteResponse,
    });
    stubMethod(sandbox, cmd, 'handlePrompt').returns(confirm);
    fsUnlink = stubMethod(sandbox, fsPromises, 'unlink').resolves(true);
    moveToStashStub = stubMethod(sandbox, cmd, 'moveFileToStash');
    restoreFromStashStub = stubMethod(sandbox, cmd, 'restoreFileFromStash');
    deleteStashStub = stubMethod(sandbox, cmd, 'deleteStash');

    return cmd.runIt();
  };

  beforeEach(() => {
    resolveProjectConfigStub = sandbox.stub();
    buildComponentSetStub = stubMethod(sandbox, ComponentSetBuilder, 'build').resolves({
      toArray: () => [new SourceComponent(exampleSourceComponent)],
    });
    lifecycleEmitStub = sandbox.stub(Lifecycle.prototype, 'emit');
  });

  afterEach(() => {
    sandbox.restore();
  });

  // Ensure SourceCommand.createComponentSet() args
  const ensureCreateComponentSetArgs = (overrides?: Partial<ComponentSetOptions>) => {
    const defaultArgs = {
      sourcepath: undefined,
      metadata: undefined,
      apiversion: undefined,
      sourceapiversion: undefined,
    };
    const expectedArgs = { ...defaultArgs, ...overrides };

    expect(buildComponentSetStub.calledOnce).to.equal(true);
    expect(buildComponentSetStub.firstCall.args[0]).to.deep.equal(expectedArgs);
  };

  // Ensure Lifecycle hooks are called properly
  const ensureHookArgs = () => {
    const failureMsg = 'Lifecycle.emit() should be called for predeploy and postdeploy';
    expect(lifecycleEmitStub.calledTwice, failureMsg).to.equal(true);
    expect(lifecycleEmitStub.firstCall.args[0]).to.equal('predeploy');
    expect(lifecycleEmitStub.secondCall.args[0]).to.equal('postdeploy');
  };

  it('should pass along sourcepath', async () => {
    const sourcepath = ['somepath'];
    stubMethod(sandbox, fs, 'statSync').returns({ isDirectory: () => false });
    await runDeleteCmd(['--sourcepath', sourcepath[0], '--json', '-r']);
    ensureCreateComponentSetArgs({ sourcepath });
    ensureHookArgs();
    // deleting the component and its xml
    expect(fsUnlink.callCount).to.equal(2);
  });

  it('should pass along metadata', async () => {
    const metadata = ['ApexClass:MyClass'];
    stubMethod(sandbox, fs, 'statSync').returns({ isDirectory: () => false });
    await runDeleteCmd(['--metadata', metadata[0], '--json', '-r']);
    ensureCreateComponentSetArgs({
      metadata: {
        metadataEntries: metadata,
        directoryPaths: [defaultPackagePath],
      },
    });
    ensureHookArgs();
  });

  it('should pass along apiversion', async () => {
    const metadata = ['ApexClass:MyClass'];
    stubMethod(sandbox, fs, 'statSync').returns({ isDirectory: () => false });

    await runDeleteCmd(['--metadata', metadata[0], '--json', '-r', '--apiversion', '52.0']);
    ensureCreateComponentSetArgs({
      metadata: {
        metadataEntries: metadata,
        directoryPaths: [defaultPackagePath],
      },
      apiversion: '52.0',
    });
    ensureHookArgs();
  });

  it('should pass along sourceapiversion', async () => {
    const sourceApiVersion = '50.0';
    const metadata = ['ApexClass:MyClass'];

    resolveProjectConfigStub.resolves({ sourceApiVersion });
    stubMethod(sandbox, fs, 'statSync').returns({ isDirectory: () => false });

    await runDeleteCmd(['--metadata', metadata[0], '--json', '-r']);
    ensureCreateComponentSetArgs({
      sourceapiversion: sourceApiVersion,
      metadata: {
        metadataEntries: metadata,
        directoryPaths: [defaultPackagePath],
      },
    });
    ensureHookArgs();
  });

  const stubLWC = (): string => {
    buildComponentSetStub.restore();
    const comp = new SourceComponent({
      name: 'mylwc',
      type: {
        id: 'lightningcomponentbundle',
        name: 'LightningComponentBundle',
        strategies: {
          adapter: 'bundle',
        },
      },
    });
    stubMethod(sandbox, ComponentSetBuilder, 'build').resolves({
      toArray: () => [comp],
    });
    const helperPath = join('dreamhouse-lwc', 'force-app', 'main', 'default', 'lwc', 'mylwc', 'helper.js');

    stubMethod(sandbox, comp, 'walkContent').returns([
      join('dreamhouse-lwc', 'force-app', 'main', 'default', 'lwc', 'mylwc', 'mylwc.js'),
      helperPath,
    ]);

    stubMethod(sandbox, fs, 'statSync').returns({ isDirectory: () => false });
    return helperPath;
  };

  it('will use stash and delete stash upon successful delete', async () => {
    const sourcepath = stubLWC();
    const result = await runDeleteCmd(['--sourcepath', sourcepath, '--json', '-r']);
    // successful delete will move files to the stash, delete the stash, and won't restore from it
    expect(moveToStashStub.calledOnce).to.be.true;
    expect(deleteStashStub.calledOnce).to.be.true;
    expect(restoreFromStashStub.called).to.be.false;
    expect(result.deletedSource).to.deep.equal([
      {
        filePath: sourcepath,
        fullName: join('mylwc', 'helper.js'),
        state: 'Deleted',
        type: 'LightningComponentBundle',
      },
    ]);
  });

  it('restores from stash during aborted delete', async () => {
    const sourcepath = stubLWC();

    confirm = false;
    const result = await runDeleteCmd(['--sourcepath', sourcepath, '--json', '-r']);
    // aborted delete will move files to the stash, and restore from it
    expect(moveToStashStub.calledOnce).to.be.true;
    expect(deleteStashStub.called).to.be.false;
    expect(restoreFromStashStub.calledOnce).to.be.true;
    // ensure JSON output from aborted delete
    expect(result).to.deep.equal({
      result: {
        deletedSource: [],
        deletes: [{}],
        outboundFiles: [],
      },
      status: 0,
    });
  });
});
