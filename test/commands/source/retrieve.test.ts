/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as sinon from 'sinon';
import { expect } from 'chai';
import { RetrieveOptions } from '@salesforce/source-deploy-retrieve';
import { Lifecycle, Org, SfdxProject } from '@salesforce/core';
import { fromStub, stubInterface, stubMethod } from '@salesforce/ts-sinon';
import { IConfig } from '@oclif/config';
import { UX } from '@salesforce/command';
import { Retrieve } from '../../../src/commands/force/source/retrieve';
import { RetrieveCommandResult, RetrieveResultFormatter } from '../../../src/formatters/retrieveResultFormatter';
import { ComponentSetBuilder, ComponentSetOptions } from '../../../src/componentSetBuilder';
import { getRetrieveResult } from './retrieveResponses';
import { exampleSourceComponent } from './testConsts';

describe('force:source:retrieve', () => {
  const sandbox = sinon.createSandbox();
  const username = 'retrieve-test@org.com';
  const packageXml = 'package.xml';
  const defaultPackagePath = 'defaultPackagePath';

  const oclifConfigStub = fromStub(stubInterface<IConfig>(sandbox));

  const retrieveResult = getRetrieveResult('success');
  const expectedResults: RetrieveCommandResult = {
    response: retrieveResult.response,
    inboundFiles: retrieveResult.getFileResponses(),
    packages: [],
    warnings: [],
  };

  // Stubs
  let buildComponentSetStub: sinon.SinonStub;
  let retrieveStub: sinon.SinonStub;
  let startStub: sinon.SinonStub;
  let lifecycleEmitStub: sinon.SinonStub;

  class TestRetrieve extends Retrieve {
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

  const runRetrieveCmd = async (params: string[]) => {
    const cmd = new TestRetrieve(params, oclifConfigStub);
    stubMethod(sandbox, cmd, 'assignProject').callsFake(() => {
      const sfdxProjectStub = fromStub(
        stubInterface<SfdxProject>(sandbox, {
          getDefaultPackage: () => ({ fullPath: defaultPackagePath }),
          getUniquePackageDirectories: () => [{ fullPath: defaultPackagePath }],
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
    stubMethod(sandbox, RetrieveResultFormatter.prototype, 'display');
    return cmd.runIt();
  };

  beforeEach(() => {
    startStub = sandbox.stub().returns(retrieveResult);
    retrieveStub = sandbox.stub().returns({ start: startStub });
    buildComponentSetStub = stubMethod(sandbox, ComponentSetBuilder, 'build').resolves({
      retrieve: retrieveStub,
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

  // Ensure SourceCommand.createComponentSet() args
  const ensureCreateComponentSetArgs = (overrides?: Partial<ComponentSetOptions>) => {
    const defaultArgs = {
      packagenames: undefined,
      sourcepath: undefined,
      manifest: undefined,
      metadata: undefined,
      apiversion: undefined,
    };
    const expectedArgs = { ...defaultArgs, ...overrides };

    expect(buildComponentSetStub.calledOnce).to.equal(true);
    expect(buildComponentSetStub.firstCall.args[0]).to.deep.equal(expectedArgs);
  };

  // Ensure ComponentSet.retrieve() args
  const ensureRetrieveArgs = (overrides?: Partial<RetrieveOptions>) => {
    const defaultRetrieveArgs = {
      usernameOrConnection: username,
      merge: true,
      output: defaultPackagePath,
      packageNames: undefined,
    };
    const expectedRetrieveArgs = { ...defaultRetrieveArgs, ...overrides };

    expect(retrieveStub.calledOnce).to.equal(true);
    expect(retrieveStub.firstCall.args[0]).to.deep.equal(expectedRetrieveArgs);
  };

  // Ensure Lifecycle hooks are called properly
  const ensureHookArgs = () => {
    const failureMsg = 'Lifecycle.emit() should be called for preretrieve and postretrieve';
    expect(lifecycleEmitStub.calledTwice, failureMsg).to.equal(true);
    expect(lifecycleEmitStub.firstCall.args[0]).to.equal('preretrieve');
    expect(lifecycleEmitStub.firstCall.args[1]).to.deep.equal([exampleSourceComponent]);
    expect(lifecycleEmitStub.secondCall.args[0]).to.equal('postretrieve');
    expect(lifecycleEmitStub.secondCall.args[1]).to.deep.equal(expectedResults.response);
  };

  it('should pass along sourcepath', async () => {
    const sourcepath = ['somepath'];
    const result = await runRetrieveCmd(['--sourcepath', sourcepath[0], '--json']);
    expect(result).to.deep.equal(expectedResults);
    ensureCreateComponentSetArgs({ sourcepath });
    ensureRetrieveArgs();
    ensureHookArgs();
  });

  it('should pass along metadata', async () => {
    const metadata = ['ApexClass:MyClass'];
    const result = await runRetrieveCmd(['--metadata', metadata[0], '--json']);
    expect(result).to.deep.equal(expectedResults);
    ensureCreateComponentSetArgs({
      metadata: {
        metadataEntries: metadata,
        directoryPaths: [defaultPackagePath],
      },
    });
    ensureRetrieveArgs();
    ensureHookArgs();
  });

  it('should pass along manifest', async () => {
    const manifest = 'package.xml';
    const result = await runRetrieveCmd(['--manifest', manifest, '--json']);
    expect(result).to.deep.equal(expectedResults);
    ensureCreateComponentSetArgs({
      manifest: {
        manifestPath: manifest,
        directoryPaths: [defaultPackagePath],
      },
    });
    ensureRetrieveArgs();
    ensureHookArgs();
  });

  it('should pass along apiversion', async () => {
    const manifest = 'package.xml';
    const apiversion = '50.0';
    const result = await runRetrieveCmd(['--manifest', manifest, '--apiversion', apiversion, '--json']);
    expect(result).to.deep.equal(expectedResults);
    ensureCreateComponentSetArgs({
      apiversion,
      manifest: {
        manifestPath: manifest,
        directoryPaths: [defaultPackagePath],
      },
    });
    ensureRetrieveArgs();
    ensureHookArgs();
  });

  it('should pass along packagenames', async () => {
    const manifest = 'package.xml';
    const packagenames = ['package1'];
    const result = await runRetrieveCmd(['--manifest', manifest, '--packagenames', packagenames[0], '--json']);
    expect(result).to.deep.equal(expectedResults);
    ensureCreateComponentSetArgs({
      packagenames,
      manifest: {
        manifestPath: manifest,
        directoryPaths: [defaultPackagePath],
      },
    });
    ensureRetrieveArgs({ packageNames: packagenames });
    ensureHookArgs();
  });
});
