/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { join } from 'path';
import * as sinon from 'sinon';
import { expect } from 'chai';
import { ComponentSet } from '@salesforce/source-deploy-retrieve';
import { fs, Lifecycle, Org, SfdxProject } from '@salesforce/core';
import { fromStub, stubInterface, stubMethod } from '@salesforce/ts-sinon';
import { IConfig } from '@oclif/config';
import { UX } from '@salesforce/command';
import { ComponentSetBuilder, ComponentSetOptions } from '../../../src/componentSetBuilder';
import { Delete } from '../../../src/commands/force/source/delete';
import { exampleDeleteResponse, exampleSourceComponent } from './testConsts';

describe('force:source:delete', () => {
  const sandbox = sinon.createSandbox();
  const username = 'delete-test@org.com';
  const defaultPackagePath = 'defaultPackagePath';

  const oclifConfigStub = fromStub(stubInterface<IConfig>(sandbox));

  // Stubs
  let buildComponentSetStub: sinon.SinonStub;
  let lifecycleEmitStub: sinon.SinonStub;
  let resolveProjectConfigStub: sinon.SinonStub;
  let fsUnlink: sinon.SinonStub;

  class TestDelete extends Delete {
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

  const runDeleteCmd = async (params: string[]) => {
    const cmd = new TestDelete(params, oclifConfigStub);
    stubMethod(sandbox, SfdxProject, 'resolveProjectPath').resolves(join('path', 'to', 'package'));
    stubMethod(sandbox, cmd, 'assignProject').callsFake(() => {
      const sfdxProjectStub = fromStub(
        stubInterface<SfdxProject>(sandbox, {
          getDefaultPackage: () => ({ fullPath: defaultPackagePath }),
          getUniquePackageDirectories: () => [{ fullPath: defaultPackagePath }],
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
    stubMethod(sandbox, UX.prototype, 'log');
    stubMethod(sandbox, ComponentSet.prototype, 'deploy').resolves({
      id: '123',
      pollStatus: () => {
        return exampleDeleteResponse;
      },
    });
    fsUnlink = stubMethod(sandbox, fs, 'unlinkSync').returns(true);

    return cmd.runIt();
  };

  beforeEach(() => {
    resolveProjectConfigStub = sandbox.stub();
    buildComponentSetStub = stubMethod(sandbox, ComponentSetBuilder, 'build').resolves({
      getSourceComponents: () => {
        return {
          toArray: () => {
            return [exampleSourceComponent];
          },
        };
      },
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
    await runDeleteCmd(['--sourcepath', sourcepath[0], '--json', '-r']);
    ensureCreateComponentSetArgs({ sourcepath });
    ensureHookArgs();
    expect(fsUnlink.callCount).to.equal(2);
  });

  it('should pass along metadata', async () => {
    const metadata = ['ApexClass:MyClass'];
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
});
