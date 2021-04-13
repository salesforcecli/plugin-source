/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as sinon from 'sinon';
import { expect } from 'chai';
import { RetrieveResult, RetrieveOptions } from '@salesforce/source-deploy-retrieve';
import { Dictionary } from '@salesforce/ts-types';
import { Lifecycle } from '@salesforce/core';
import { Retrieve } from '../../../src/commands/force/source/retrieve';
import { FlagOptions } from '../../../src/sourceCommand';

describe('force:source:retrieve', () => {
  const sandbox = sinon.createSandbox();
  const username = 'retrieve-test@org.com';
  const packageXml = 'package.xml';
  const defaultPackagePath = 'defaultPackagePath';

  // TODO: When output work items have been done we can test result output
  //       that more closely matches actual output.
  const stubbedResults = {
    response: { status: 'Complete' },
    getFileResponses: () => 'TBD',
  };

  // Stubs
  let createComponentSetStub: sinon.SinonStub;
  let retrieveStub: sinon.SinonStub;
  let startStub: sinon.SinonStub;
  let lifecycleEmitStub: sinon.SinonStub;

  // Call the force:source:retrieve run method
  const run = async (flags: Dictionary<boolean | string | number | string[]> = {}): Promise<RetrieveResult> => {
    return Retrieve.prototype.run.call({
      flags: Object.assign({}, flags),
      ux: {
        log: () => {},
        logJson: () => {},
        styledHeader: () => {},
        table: () => {},
      },
      logger: {
        debug: () => {},
      },
      org: {
        getUsername: () => username,
      },
      project: {
        getDefaultPackage: () => ({ fullPath: defaultPackagePath }),
      },
      createComponentSet: createComponentSetStub,
    }) as Promise<RetrieveResult>;
  };

  beforeEach(() => {
    startStub = sandbox.stub().returns(stubbedResults);
    retrieveStub = sandbox.stub().returns({ start: startStub });
    createComponentSetStub = sandbox.stub().returns({
      retrieve: retrieveStub,
      getPackageXml: () => packageXml,
    });
    lifecycleEmitStub = sandbox.stub(Lifecycle.prototype, 'emit');
  });

  afterEach(() => {
    sandbox.restore();
  });

  // Ensure SourceCommand.createComponentSet() args
  const ensureCreateComponentSetArgs = (overrides?: Partial<FlagOptions>) => {
    const defaultArgs = {
      packagenames: undefined,
      sourcepath: undefined,
      manifest: undefined,
      metadata: undefined,
      apiversion: undefined,
    };
    const expectedArgs = { ...defaultArgs, ...overrides };

    expect(createComponentSetStub.calledOnce).to.equal(true);
    expect(createComponentSetStub.firstCall.args[0]).to.deep.equal(expectedArgs);
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
    expect(lifecycleEmitStub.firstCall.args[1]).to.deep.equal({
      packageXmlPath: packageXml,
    });
    expect(lifecycleEmitStub.secondCall.args[0]).to.equal('postretrieve');
    expect(lifecycleEmitStub.secondCall.args[1]).to.deep.equal(stubbedResults.response);
  };

  it('should pass along sourcepath', async () => {
    const sourcepath = ['somepath'];
    const result = await run({ sourcepath, json: true });
    expect(result).to.deep.equal(stubbedResults.getFileResponses());
    ensureCreateComponentSetArgs({ sourcepath });
    ensureRetrieveArgs();
    ensureHookArgs();
  });

  it('should pass along metadata', async () => {
    const metadata = ['ApexClass:MyClass'];
    const result = await run({ metadata, json: true });
    expect(result).to.deep.equal(stubbedResults.getFileResponses());
    ensureCreateComponentSetArgs({ metadata });
    ensureRetrieveArgs();
    ensureHookArgs();
  });

  it('should pass along manifest', async () => {
    const manifest = 'package.xml';
    const result = await run({ manifest, json: true });
    expect(result).to.deep.equal(stubbedResults.getFileResponses());
    ensureCreateComponentSetArgs({ manifest });
    ensureRetrieveArgs();
    ensureHookArgs();
  });

  it('should pass along apiversion', async () => {
    const manifest = 'package.xml';
    const apiversion = '50.0';
    const result = await run({ manifest, apiversion, json: true });
    expect(result).to.deep.equal(stubbedResults.getFileResponses());
    ensureCreateComponentSetArgs({ apiversion, manifest });
    ensureRetrieveArgs();
    ensureHookArgs();
  });

  it('should pass along packagenames', async () => {
    const manifest = 'package.xml';
    const packagenames = ['package1'];
    const result = await run({ manifest, packagenames, json: true });
    expect(result).to.deep.equal(stubbedResults.getFileResponses());
    ensureCreateComponentSetArgs({ manifest, packagenames });
    ensureRetrieveArgs({ packageNames: packagenames });
    ensureHookArgs();
  });
});
