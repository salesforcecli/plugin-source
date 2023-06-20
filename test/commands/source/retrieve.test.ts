/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { join } from 'path';
import * as path from 'path';
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
import { Lifecycle, Messages, SfProject } from '@salesforce/core';
import { stubMethod } from '@salesforce/ts-sinon';
import { stubSfCommandUx, stubSpinner, stubUx } from '@salesforce/sf-plugins-core';
import { MockTestOrgData, TestContext } from '@salesforce/core/lib/testSetup';
import { Retrieve } from '../../../src/commands/force/source/retrieve';
import { RetrieveCommandResult, RetrieveResultFormatter } from '../../../src/formatters/retrieveResultFormatter';
import { getRetrieveResult } from './retrieveResponses';
import { exampleSourceComponent } from './testConsts';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'retrieve');

describe.only('force:source:retrieve', () => {
  const $$ = new TestContext();
  const testOrg = new MockTestOrgData();
  let sfCommandUxStubs: ReturnType<typeof stubSfCommandUx>;

  testOrg.username = 'retrieve-test@org.com';
  const packageXml = 'package.xml';
  const defaultPackagePath = 'defaultPackagePath';
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
  let expectedDirectoryPath: string;

  beforeEach(async () => {
    await $$.stubAuths(testOrg);
    await $$.stubConfig({ 'target-org': testOrg.username });
    sfCommandUxStubs = stubSfCommandUx($$.SANDBOX);
    stubUx($$.SANDBOX);
    stubSpinner($$.SANDBOX);
    $$.setConfigStubContents('SfProjectJson', {
      contents: {
        packageDirectories: [
          {
            path: defaultPackagePath,
            fullPath: defaultPackagePath,
            default: true,
          },
        ],
      },
    });
    expectedDirectoryPath = SfProject.getInstance().getDefaultPackage().fullPath;
    stubMethod($$.SANDBOX, Retrieve.prototype, 'moveResultsForRetrieveTargetDir');

    pollStub = $$.SANDBOX.stub().resolves(retrieveResult);
    retrieveStub = $$.SANDBOX.stub().resolves({
      pollStatus: pollStub,
      retrieveId: retrieveResult.response.id,
    });
    buildComponentSetStub = stubMethod($$.SANDBOX, ComponentSetBuilder, 'build').resolves({
      retrieve: retrieveStub,
      getPackageXml: () => packageXml,
      toArray: () => [exampleSourceComponent],
      has: () => false,
    });
    lifecycleEmitStub = $$.SANDBOX.stub(Lifecycle.prototype, 'emit');
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
      usernameOrConnection: testOrg.username,
      merge: true,
      output: SfProject.getInstance().getDefaultPackage().fullPath,
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
    const result = await Retrieve.run(['--sourcepath', sourcepath[0], '--json']);
    expect(result).to.deep.equal(expectedResults);
    ensureCreateComponentSetArgs({ sourcepath });
    ensureRetrieveArgs();
    ensureHookArgs();
  });
  it('should pass along retrievetargetdir', async () => {
    const sourcepath = ['somepath'];
    const metadata = ['ApexClass:MyClass'];
    const result = await Retrieve.run(['--retrievetargetdir', sourcepath[0], '--metadata', metadata[0], '--json']);
    expect(result).to.deep.equal(expectedResults);
    ensureCreateComponentSetArgs({
      sourcepath: undefined,
      metadata: {
        directoryPaths: [],
        metadataEntries: ['ApexClass:MyClass'],
      },
    });
    ensureRetrieveArgs({ output: path.resolve(sourcepath[0]) });
    ensureHookArgs();
  });

  it('should pass along metadata', async () => {
    const metadata = ['ApexClass:MyClass'];
    const result = await Retrieve.run(['--metadata', metadata[0], '--json']);
    expect(result).to.deep.equal(expectedResults);
    ensureCreateComponentSetArgs({
      metadata: {
        metadataEntries: metadata,
        directoryPaths: [expectedDirectoryPath],
      },
    });
    ensureRetrieveArgs();
    ensureHookArgs();
  });

  it('should pass along manifest', async () => {
    const manifest = 'package.xml';
    const result = await Retrieve.run(['--manifest', manifest, '--json']);
    expect(result).to.deep.equal(expectedResults);
    ensureCreateComponentSetArgs({
      manifest: {
        manifestPath: manifest,
        directoryPaths: [expectedDirectoryPath],
      },
    });
    ensureRetrieveArgs();
    ensureHookArgs();
  });

  it('should pass along apiversion', async () => {
    const manifest = 'package.xml';
    const apiversion = '50.0';
    const result = await Retrieve.run(['--manifest', manifest, '--api-version', apiversion, '--json']);
    expect(result).to.deep.equal(expectedResults);
    ensureCreateComponentSetArgs({
      apiversion,
      manifest: {
        manifestPath: manifest,
        directoryPaths: [expectedDirectoryPath],
      },
    });
    ensureRetrieveArgs();
    ensureHookArgs();
  });

  it('should pass along sourceapiversion', async () => {
    const sourceApiVersion = '50.0';
    const manifest = 'package.xml';
    $$.SANDBOX.stub(SfProject.prototype, 'resolveProjectConfig').resolves({ sourceApiVersion });
    const result = await Retrieve.run(['--manifest', manifest, '--json']);
    expect(result).to.deep.equal(expectedResults);
    ensureCreateComponentSetArgs({
      sourceapiversion: sourceApiVersion,
      manifest: {
        manifestPath: manifest,
        directoryPaths: [expectedDirectoryPath],
      },
    });
    ensureRetrieveArgs();
    ensureHookArgs();
  });

  it('should pass along packagenames', async () => {
    const manifest = 'package.xml';
    const packagenames = ['package1'];
    const result = await Retrieve.run(['--manifest', manifest, '--packagenames', packagenames[0], '--json']);
    expectedResults.packages.push({
      name: packagenames[0],
      path: join(await SfProject.resolveProjectPath(), packagenames[0]),
    });
    expect(result).to.deep.equal(expectedResults);
    ensureCreateComponentSetArgs({
      packagenames,
      manifest: {
        manifestPath: manifest,
        directoryPaths: [expectedDirectoryPath],
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
    const result = await Retrieve.run([
      '--manifest',
      manifest,
      '--packagenames',
      'package1',
      '--packagenames',
      'package2',
      '--json',
    ]);
    for (const pkg of packagenames) {
      // eslint-disable-next-line no-await-in-loop
      expectedResults.packages.push({ name: pkg, path: join(await SfProject.resolveProjectPath(), pkg) });
    }
    expect(result).to.deep.equal(expectedResults);
    ensureCreateComponentSetArgs({
      packagenames,
      manifest: {
        manifestPath: manifest,
        directoryPaths: [expectedDirectoryPath],
      },
    });
    ensureRetrieveArgs({ packageOptions: packagenames });
    ensureHookArgs();
    // reset the packages for other tests
    expectedResults.packages = [];
  });

  it('should display output with no --json', async () => {
    const displayStub = $$.SANDBOX.stub(RetrieveResultFormatter.prototype, 'display');
    const getJsonStub = $$.SANDBOX.stub(RetrieveResultFormatter.prototype, 'getJson');
    await Retrieve.run(['--sourcepath', 'somepath']);
    expect(displayStub.calledOnce).to.equal(true);
    expect(getJsonStub.calledOnce).to.equal(true);
  });

  it('should NOT display output with --json', async () => {
    const displayStub = $$.SANDBOX.stub(RetrieveResultFormatter.prototype, 'display');
    const getJsonStub = $$.SANDBOX.stub(RetrieveResultFormatter.prototype, 'getJson');
    await Retrieve.run(['--sourcepath', 'somepath', '--json']);
    expect(displayStub.calledOnce).to.equal(false);
    expect(getJsonStub.calledOnce).to.equal(true);
  });

  it('should warn users when retrieving CustomField with --metadata', async () => {
    const metadata = 'CustomField';
    buildComponentSetStub.restore();
    buildComponentSetStub = stubMethod($$.SANDBOX, ComponentSetBuilder, 'build').resolves({
      retrieve: retrieveStub,
      getPackageXml: () => packageXml,
      toArray: () => [exampleSourceComponent],
      add: (component: ComponentLike) => {
        expect(component)
          .to.be.a('object')
          .and.to.have.property('type')
          .and.to.deep.include({ id: 'customobject', name: 'CustomObject' });
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
    await Retrieve.run(['--metadata', metadata]);
    expect(sfCommandUxStubs.warn.called).to.be.true;
    expect(
      sfCommandUxStubs.warn
        .getCalls()
        .flatMap((call) => call.args)
        .includes(messages.getMessage('wantsToRetrieveCustomFields'))
    );
  });

  it('should not warn users when retrieving CustomField,CustomObject with --metadata', async () => {
    const metadata = 'CustomField,CustomObject';
    buildComponentSetStub.restore();
    buildComponentSetStub = stubMethod($$.SANDBOX, ComponentSetBuilder, 'build').resolves({
      retrieve: retrieveStub,
      getPackageXml: () => packageXml,
      toArray: () => [exampleSourceComponent],
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
    await Retrieve.run(['--metadata', metadata]);
    expect(sfCommandUxStubs.warn.called).to.be.true;
    expect(
      sfCommandUxStubs.warn
        .getCalls()
        .flatMap((call) => call.args)
        .includes(messages.getMessage('wantsToRetrieveCustomFields'))
    );
  });

  it('should warn users when retrieving CustomField with --manifest', async () => {
    const manifest = 'package.xml';
    buildComponentSetStub.restore();
    buildComponentSetStub = stubMethod($$.SANDBOX, ComponentSetBuilder, 'build').resolves({
      retrieve: retrieveStub,
      getPackageXml: () => packageXml,
      toArray: () => [exampleSourceComponent],
      add: (component: ComponentLike) => {
        expect(component)
          .to.be.a('object')
          .and.to.have.property('type')
          .and.to.deep.include({ id: 'customobject', name: 'CustomObject' });
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
    await Retrieve.run(['--manifest', manifest]);
    expect(sfCommandUxStubs.warn.called).to.be.true;
    expect(
      sfCommandUxStubs.warn
        .getCalls()
        .flatMap((call) => call.args)
        .includes(messages.getMessage('wantsToRetrieveCustomFields'))
    );
  });

  it('should not be warn users when retrieving CustomField,CustomObject with --manifest', async () => {
    const manifest = 'package.xml';
    buildComponentSetStub.restore();
    buildComponentSetStub = stubMethod($$.SANDBOX, ComponentSetBuilder, 'build').resolves({
      retrieve: retrieveStub,
      getPackageXml: () => packageXml,
      toArray: () => [exampleSourceComponent],
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
    await Retrieve.run(['--manifest', manifest]);
    expect(sfCommandUxStubs.warn.calledOnce).to.be.true;
    expect(
      sfCommandUxStubs.warn
        .getCalls()
        .flatMap((call) => call.args)
        .includes(messages.getMessage('wantsToRetrieveCustomFields'))
    );
  });
});
