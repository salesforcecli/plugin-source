/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { join } from 'path';
import * as sinon from 'sinon';
import { expect } from 'chai';
import {
  ComponentLike,
  ComponentSet,
  ComponentSetBuilder,
  ComponentSetOptions,
  MetadataType,
  RetrieveOptions,
} from '@salesforce/source-deploy-retrieve';
import { Lifecycle, Messages, Org, SfProject } from '@salesforce/core';
import { fromStub, stubInterface, stubMethod } from '@salesforce/ts-sinon';
import { Config } from '@oclif/core';
import { UX } from '@salesforce/command';
import { Retrieve } from '../../../src/commands/force/source/retrieve';
import { RetrieveCommandResult, RetrieveResultFormatter } from '../../../src/formatters/retrieveResultFormatter';
import { getRetrieveResult } from './retrieveResponses';
import { exampleSourceComponent } from './testConsts';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'retrieve');

describe('force:source:retrieve', () => {
  const sandbox = sinon.createSandbox();
  const username = 'retrieve-test@org.com';
  const packageXml = 'package.xml';
  const defaultPackagePath = 'defaultPackagePath';

  const oclifConfigStub = fromStub(stubInterface<Config>(sandbox));

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
  let pollStub: sinon.SinonStub;
  let lifecycleEmitStub: sinon.SinonStub;
  let resolveProjectConfigStub: sinon.SinonStub;
  let warnStub: sinon.SinonStub;

  class TestRetrieve extends Retrieve {
    public async runIt() {
      await this.init();
      return this.run();
    }
    public setOrg(org: Org) {
      this.org = org;
    }
    public setProject(project: SfProject) {
      this.project = project;
    }
  }

  const runRetrieveCmd = async (params: string[]) => {
    const cmd = new TestRetrieve(params, oclifConfigStub);
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
    // keep the stdout from showing up in the test output
    stubMethod(sandbox, UX.prototype, 'log');
    stubMethod(sandbox, UX.prototype, 'setSpinnerStatus');
    stubMethod(sandbox, UX.prototype, 'startSpinner');
    stubMethod(sandbox, UX.prototype, 'stopSpinner');
    stubMethod(sandbox, UX.prototype, 'styledHeader');
    stubMethod(sandbox, UX.prototype, 'table');
    return cmd.runIt();
  };

  beforeEach(() => {
    resolveProjectConfigStub = sandbox.stub();
    pollStub = sandbox.stub().resolves(retrieveResult);
    retrieveStub = sandbox.stub().resolves({
      pollStatus: pollStub,
      retrieveId: retrieveResult.response.id,
    });
    buildComponentSetStub = stubMethod(sandbox, ComponentSetBuilder, 'build').resolves({
      retrieve: retrieveStub,
      getPackageXml: () => packageXml,
      toArray: () => {
        return [exampleSourceComponent];
      },
      has: () => {
        return false;
      },
    });
    lifecycleEmitStub = sandbox.stub(Lifecycle.prototype, 'emit');
    warnStub = stubMethod(sandbox, UX.prototype, 'warn');
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
      sourceapiversion: undefined,
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
      packageOptions: undefined,
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
    expect(lifecycleEmitStub.secondCall.args[1]).to.deep.equal(expectedResults.inboundFiles);
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

  it('should pass along sourceapiversion', async () => {
    const sourceApiVersion = '50.0';
    resolveProjectConfigStub.resolves({ sourceApiVersion });
    const manifest = 'package.xml';
    const result = await runRetrieveCmd(['--manifest', manifest, '--json']);
    expect(result).to.deep.equal(expectedResults);
    ensureCreateComponentSetArgs({
      sourceapiversion: sourceApiVersion,
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
    expectedResults.packages.push({ name: packagenames[0], path: join('path', 'to', 'package', packagenames[0]) });
    expect(result).to.deep.equal(expectedResults);
    ensureCreateComponentSetArgs({
      packagenames,
      manifest: {
        manifestPath: manifest,
        directoryPaths: [defaultPackagePath],
      },
    });
    ensureRetrieveArgs({ packageOptions: packagenames });
    ensureHookArgs();
    // reset the packages for other tests
    expectedResults.packages = [];
  });

  it('should pass along multiple packagenames', async () => {
    const manifest = 'package.xml';
    const packagenames = ['package1', 'package2'];
    const result = await runRetrieveCmd(['--manifest', manifest, '--packagenames', packagenames.join(','), '--json']);
    packagenames.forEach((pkg) => {
      expectedResults.packages.push({ name: pkg, path: join('path', 'to', 'package', pkg) });
    });
    expect(result).to.deep.equal(expectedResults);
    ensureCreateComponentSetArgs({
      packagenames,
      manifest: {
        manifestPath: manifest,
        directoryPaths: [defaultPackagePath],
      },
    });
    ensureRetrieveArgs({ packageOptions: packagenames });
    ensureHookArgs();
    // reset the packages for other tests
    expectedResults.packages = [];
  });

  it('should display output with no --json', async () => {
    const displayStub = sandbox.stub(RetrieveResultFormatter.prototype, 'display');
    const getJsonStub = sandbox.stub(RetrieveResultFormatter.prototype, 'getJson');
    await runRetrieveCmd(['--sourcepath', 'somepath']);
    expect(displayStub.calledOnce).to.equal(true);
    expect(getJsonStub.calledOnce).to.equal(true);
  });

  it('should NOT display output with --json', async () => {
    const displayStub = sandbox.stub(RetrieveResultFormatter.prototype, 'display');
    const getJsonStub = sandbox.stub(RetrieveResultFormatter.prototype, 'getJson');
    await runRetrieveCmd(['--sourcepath', 'somepath', '--json']);
    expect(displayStub.calledOnce).to.equal(false);
    expect(getJsonStub.calledOnce).to.equal(true);
  });

  it('should warn users when retrieving CustomField with --metadata', async () => {
    const metadata = 'CustomField';
    buildComponentSetStub.restore();
    buildComponentSetStub = stubMethod(sandbox, ComponentSetBuilder, 'build').resolves({
      retrieve: retrieveStub,
      getPackageXml: () => packageXml,
      toArray: () => {
        return [exampleSourceComponent];
      },
      add: (component: ComponentLike) => {
        expect(component)
          .to.be.a('object')
          .and.to.have.property('type')
          .and.to.deep.equal({ id: 'customobject', name: 'CustomObject' });
        expect(component).and.to.have.property('fullName').and.to.be.equal(ComponentSet.WILDCARD);
      },
      has: (component: ComponentLike) => {
        expect(component).to.be.a('object').and.to.have.property('type');
        expect(component).and.to.have.property('fullName').and.to.be.equal(ComponentSet.WILDCARD);
        const type = component.type as MetadataType;
        if (type.name === 'CustomField') {
          return true;
        }
        if (type.name === 'CustomObject') {
          return false;
        }
      },
    });
    await runRetrieveCmd(['--metadata', metadata]);
    expect(warnStub.calledOnce);
    expect(warnStub.firstCall.firstArg).to.equal(messages.getMessage('wantsToRetrieveCustomFields'));
  });

  it('should not warn users when retrieving CustomField,CustomObject with --metadata', async () => {
    const metadata = 'CustomField,CustomObject';
    buildComponentSetStub.restore();
    buildComponentSetStub = stubMethod(sandbox, ComponentSetBuilder, 'build').resolves({
      retrieve: retrieveStub,
      getPackageXml: () => packageXml,
      toArray: () => {
        return [exampleSourceComponent];
      },
      add: (component: ComponentLike) => {
        expect(component)
          .to.be.a('object')
          .and.to.have.property('type')
          .and.to.deep.equal({ id: 'customobject', name: 'CustomObject' });
        expect(component).and.to.have.property('fullName').and.to.be.equal(ComponentSet.WILDCARD);
      },
      has: (component: ComponentLike) => {
        expect(component).to.be.a('object').and.to.have.property('type');
        expect(component).and.to.have.property('fullName').and.to.be.equal(ComponentSet.WILDCARD);
        const type = component.type as MetadataType;
        if (type.name === 'CustomField') {
          return true;
        }
        if (type.name === 'CustomObject') {
          return true;
        }
      },
    });
    await runRetrieveCmd(['--metadata', metadata]);
    expect(warnStub.callCount).to.be.equal(0);
  });

  it('should warn users when retrieving CustomField with --manifest', async () => {
    const manifest = 'package.xml';
    buildComponentSetStub.restore();
    buildComponentSetStub = stubMethod(sandbox, ComponentSetBuilder, 'build').resolves({
      retrieve: retrieveStub,
      getPackageXml: () => packageXml,
      toArray: () => {
        return [exampleSourceComponent];
      },
      add: (component: ComponentLike) => {
        expect(component)
          .to.be.a('object')
          .and.to.have.property('type')
          .and.to.deep.equal({ id: 'customobject', name: 'CustomObject' });
        expect(component).and.to.have.property('fullName').and.to.be.equal(ComponentSet.WILDCARD);
      },
      has: (component: ComponentLike) => {
        expect(component).to.be.a('object').and.to.have.property('type');
        expect(component).and.to.have.property('fullName').and.to.be.equal(ComponentSet.WILDCARD);
        const type = component.type as MetadataType;
        if (type.name === 'CustomField') {
          return true;
        }
        if (type.name === 'CustomObject') {
          return false;
        }
      },
    });
    await runRetrieveCmd(['--manifest', manifest]);
    expect(warnStub.calledOnce);
    expect(warnStub.firstCall.firstArg).to.equal(messages.getMessage('wantsToRetrieveCustomFields'));
  });

  it('should not be warn users when retrieving CustomField,CustomObject with --manifest', async () => {
    const manifest = 'package.xml';
    buildComponentSetStub.restore();
    buildComponentSetStub = stubMethod(sandbox, ComponentSetBuilder, 'build').resolves({
      retrieve: retrieveStub,
      getPackageXml: () => packageXml,
      toArray: () => {
        return [exampleSourceComponent];
      },
      add: (component: ComponentLike) => {
        expect(component)
          .to.be.a('object')
          .and.to.have.property('type')
          .and.to.deep.equal({ id: 'customobject', name: 'CustomObject' });
        expect(component).and.to.have.property('fullName').and.to.be.equal(ComponentSet.WILDCARD);
      },
      has: (component: ComponentLike) => {
        expect(component).to.be.a('object').and.to.have.property('type');
        expect(component).and.to.have.property('fullName').and.to.be.equal(ComponentSet.WILDCARD);
        const type = component.type as MetadataType;
        if (type.name === 'CustomField') {
          return true;
        }
        if (type.name === 'CustomObject') {
          return true;
        }
      },
    });
    await runRetrieveCmd(['--manifest', manifest]);
    expect(warnStub.callCount).to.be.equal(0);
  });
});
