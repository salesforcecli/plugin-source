/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as fs from 'fs';
import * as path from 'path';
import * as sinon from 'sinon';
import { expect } from 'chai';
import {
  // Lifecycle,
  Org,
} from '@salesforce/core';
import { fromStub, stubInterface, stubMethod } from '@salesforce/ts-sinon';
import { Config } from '@oclif/core';
import { UX } from '@salesforce/command';
import { ComponentSetBuilder, ComponentSetOptions, RetrieveOptions } from '@salesforce/source-deploy-retrieve';
import { Duration } from '@salesforce/kit';
import { Retrieve } from '../../../src/commands/force/mdapi/retrieve';
import { Stash, StashData } from '../../../src/stash';
import { getRetrieveResult } from '../source/retrieveResponses';

describe('force:mdapi:retrieve', () => {
  const sandbox = sinon.createSandbox();
  const username = 'retrieve-test@org.com';
  const packageXml = 'package.xml';
  const retrievetargetdir = path.resolve('retrieve-target-dir');
  const oclifConfigStub = fromStub(stubInterface<Config>(sandbox));
  const retrieveResult = getRetrieveResult('success');
  const defaultZipFilePath = path.join(retrievetargetdir, 'unpackaged.zip');
  const expectedDefaultResult = Object.assign({}, retrieveResult.response, { zipFilePath: defaultZipFilePath });

  // Stubs
  let buildComponentSetStub: sinon.SinonStub;
  let retrieveStub: sinon.SinonStub;
  let pollStub: sinon.SinonStub;
  // let lifecycleEmitStub: sinon.SinonStub;
  let stopSpinnerStub: sinon.SinonStub;
  let uxLogStub: sinon.SinonStub;
  let uxStyledHeaderStub: sinon.SinonStub;
  let uxTableStub: sinon.SinonStub;
  let stashSetStub: sinon.SinonStub;
  let stashGetStub: sinon.SinonStub;
  let fsStatStub: sinon.SinonStub;

  class TestRetrieve extends Retrieve {
    public async runIt() {
      await this.init();
      // oclif would normally populate this, but UT don't have it
      this.id ??= 'force:mdapi:retrieve';
      return this.run();
    }
    public setOrg(org: Org) {
      this.org = org;
    }
    public setUx(ux: UX) {
      this.ux = ux;
    }
  }

  const runRetrieveCmd = async (params: string[]) => {
    const cmd = new TestRetrieve(params, oclifConfigStub);
    stubMethod(sandbox, cmd, 'assignOrg').callsFake(() => {
      const orgStub = fromStub(
        stubInterface<Org>(sandbox, {
          getUsername: () => username,
        })
      );
      cmd.setOrg(orgStub);
    });

    stopSpinnerStub = stubMethod(sandbox, UX.prototype, 'stopSpinner');
    uxLogStub = stubMethod(sandbox, UX.prototype, 'log');
    uxStyledHeaderStub = stubMethod(sandbox, UX.prototype, 'styledHeader');
    uxTableStub = stubMethod(sandbox, UX.prototype, 'table');
    cmd.setUx(
      fromStub(
        stubInterface<UX>(sandbox, {
          stopSpinner: stopSpinnerStub,
          log: uxLogStub,
          styledHeader: uxStyledHeaderStub,
          table: uxTableStub,
        })
      )
    );

    return cmd.runIt();
  };

  beforeEach(() => {
    sandbox.stub(fs, 'mkdirSync');
    fsStatStub = sandbox.stub(fs, 'statSync');
    fsStatStub.withArgs(retrievetargetdir).returns({ isDirectory: () => true });
    stashSetStub = stubMethod(sandbox, Stash, 'set');
    stashGetStub = stubMethod(sandbox, Stash, 'get');
    pollStub = sandbox.stub().resolves(retrieveResult);
    retrieveStub = sandbox.stub().resolves({
      pollStatus: pollStub,
      id: retrieveResult.response.id,
    });
    buildComponentSetStub = stubMethod(sandbox, ComponentSetBuilder, 'build').resolves({
      retrieve: retrieveStub,
      getPackageXml: () => packageXml,
    });
    // lifecycleEmitStub = sandbox.stub(Lifecycle.prototype, 'emit');
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
      output: path.resolve(retrievetargetdir),
      format: 'metadata',
      packageOptions: undefined,
      singlePackage: undefined,
      zipFileName: 'unpackaged.zip',
      unzip: undefined,
    };
    const expectedRetrieveArgs = { ...defaultRetrieveArgs, ...overrides };

    expect(retrieveStub.calledOnce).to.equal(true);
    expect(retrieveStub.firstCall.args[0]).to.deep.equal(expectedRetrieveArgs);
  };

  // Ensure Lifecycle hooks are called properly
  // const ensureHookArgs = (manifest?: string) => {
  //   const failureMsg = 'Lifecycle.emit() should be called for preretrieve';
  //   expect(lifecycleEmitStub.calledOnce, failureMsg).to.equal(true);
  //   expect(lifecycleEmitStub.firstCall.args[0]).to.equal('preretrieve');
  //   expect(lifecycleEmitStub.firstCall.args[1]).to.deep.equal({ packageXmlPath: manifest });
  // };

  const ensureStashSet = (overrides?: Partial<StashData>) => {
    const defaultArgs = {
      jobid: retrieveResult.response.id,
      retrievetargetdir,
      zipfilename: 'unpackaged.zip',
      unzip: undefined,
    };
    const expectedArgs = { ...defaultArgs, ...overrides };

    expect(stashSetStub.called).to.be.true;
    expect(stashGetStub.called).to.be.false;
    expect(stashSetStub.firstCall.args[0]).to.equal('MDAPI_RETRIEVE');
    expect(stashSetStub.firstCall.args[1]).to.deep.equal(expectedArgs);
  };

  it('should pass along retrievetargetdir', async () => {
    const result = await runRetrieveCmd(['--retrievetargetdir', retrievetargetdir, '--json']);
    expect(result).to.deep.equal(expectedDefaultResult);
    ensureCreateComponentSetArgs();
    ensureRetrieveArgs();
    // ensureHookArgs();
    ensureStashSet();
    expect(fsStatStub.called).to.be.true;
    // should use the default polling timeout of 1440 minutes (86400 seconds)
    expect(pollStub.firstCall.args[0]).to.deep.equal({
      frequency: Duration.milliseconds(1000),
      timeout: Duration.minutes(1440),
    });
  });

  it('should pass along unpackaged', async () => {
    const manifestPath = path.resolve(packageXml);
    fsStatStub.withArgs(manifestPath).returns({ isDirectory: () => false });
    const result = await runRetrieveCmd(['-r', retrievetargetdir, '-k', packageXml, '--json']);
    expect(result).to.deep.equal(expectedDefaultResult);
    ensureCreateComponentSetArgs({
      manifest: {
        manifestPath,
        directoryPaths: [],
      },
    });
    ensureRetrieveArgs();
    // ensureHookArgs(manifestPath);
    ensureStashSet();
    expect(fsStatStub.called).to.be.true;
  });

  it('should pass along sourcedir', async () => {
    const sourcedir = 'sourcedir';
    const resolvedSourceDir = path.resolve(sourcedir);
    fsStatStub.withArgs(resolvedSourceDir).returns({ isDirectory: () => true });
    const result = await runRetrieveCmd(['--retrievetargetdir', retrievetargetdir, '-d', sourcedir, '--json']);
    expect(result).to.deep.equal(expectedDefaultResult);
    ensureCreateComponentSetArgs({ sourcepath: [resolvedSourceDir] });
    ensureRetrieveArgs();
    // ensureHookArgs();
    ensureStashSet();
    expect(fsStatStub.called).to.be.true;
  });

  it('should pass along packagenames', async () => {
    const packagenames = 'foo,bar';
    const result = await runRetrieveCmd(['--retrievetargetdir', retrievetargetdir, '-p', packagenames, '--json']);
    expect(result).to.deep.equal(expectedDefaultResult);
    ensureCreateComponentSetArgs({ packagenames: packagenames.split(',') });
    ensureRetrieveArgs({ packageOptions: packagenames.split(',') });
    // ensureHookArgs();
    ensureStashSet();
    expect(fsStatStub.called).to.be.true;
  });

  it('should pass along singlepackage', async () => {
    const result = await runRetrieveCmd(['--retrievetargetdir', retrievetargetdir, '--singlepackage', '--json']);
    expect(result).to.deep.equal(expectedDefaultResult);
    ensureCreateComponentSetArgs();
    ensureRetrieveArgs({ singlePackage: true });
    // ensureHookArgs();
    ensureStashSet();
    expect(fsStatStub.called).to.be.true;
  });

  it('should pass along apiversion', async () => {
    const apiversion = '54.0';
    const result = await runRetrieveCmd(['--retrievetargetdir', retrievetargetdir, '-a', apiversion, '--json']);
    expect(result).to.deep.equal(expectedDefaultResult);
    ensureCreateComponentSetArgs({ apiversion });
    ensureRetrieveArgs();
    // ensureHookArgs();
    ensureStashSet();
    expect(fsStatStub.called).to.be.true;
  });

  it('should pass along zipfilename and unzip', async () => {
    const zipfilename = 'foo.zip';
    const zipFilePath = path.join(retrievetargetdir, zipfilename);
    const expectedResult = Object.assign({}, retrieveResult.response, { zipFilePath });
    const result = await runRetrieveCmd([
      '--retrievetargetdir',
      retrievetargetdir,
      '-n',
      zipfilename,
      '--unzip',
      '--json',
    ]);
    expect(result).to.deep.equal(expectedResult);
    ensureCreateComponentSetArgs();
    ensureRetrieveArgs({ zipFileName: zipfilename, unzip: true });
    // ensureHookArgs();
    ensureStashSet({ zipfilename, unzip: true });
    expect(fsStatStub.called).to.be.true;
  });

  it('should use wait param', async () => {
    const result = await runRetrieveCmd(['--retrievetargetdir', retrievetargetdir, '-w', '5', '--json']);
    expect(result).to.deep.equal(expectedDefaultResult);
    ensureCreateComponentSetArgs();
    ensureRetrieveArgs();
    // ensureHookArgs();
    ensureStashSet();
    expect(fsStatStub.called).to.be.true;
    expect(pollStub.firstCall.args[0]).to.deep.equal({
      frequency: Duration.milliseconds(1000),
      timeout: Duration.minutes(5),
    });
  });

  it('should display expected output', async () => {
    const result = await runRetrieveCmd(['-r', retrievetargetdir]);
    expect(result).to.deep.equal(expectedDefaultResult);
    expect(uxLogStub.called).to.be.true;
    expect(uxLogStub.firstCall.args[0]).to.equal(`Retrieve ID: ${expectedDefaultResult.id}`);
    expect(uxLogStub.secondCall.args[0]).to.contain('Wrote retrieve zip to');
    expect(uxStyledHeaderStub.called).to.be.false;
    expect(uxTableStub.called).to.be.false;
  });

  it('should return verbose output', async () => {
    const result = await runRetrieveCmd(['-r', retrievetargetdir, '--verbose']);
    expect(result).to.deep.equal(expectedDefaultResult);
    expect(uxLogStub.called).to.be.true;
    expect(uxLogStub.firstCall.args[0]).to.equal(`Retrieve ID: ${expectedDefaultResult.id}`);
    expect(uxLogStub.secondCall.args[0]).to.contain('Wrote retrieve zip to');
    expect(uxStyledHeaderStub.called).to.be.true;
    expect(uxTableStub.called).to.be.true;
    expect(uxStyledHeaderStub.firstCall.args[0]).to.contain('Components Retrieved');
    expect(uxTableStub.firstCall.args[0]).to.deep.equal(expectedDefaultResult.fileProperties);
  });

  it('should return an async result with --wait 0', async () => {
    const result = await runRetrieveCmd(['--retrievetargetdir', retrievetargetdir, '-w', '0', '--json']);
    expect(result).to.deep.equal({
      done: false,
      id: expectedDefaultResult.id,
      state: 'Queued',
      status: 'Queued',
      timedOut: true,
    });
    ensureCreateComponentSetArgs();
    ensureRetrieveArgs();
    // ensureHookArgs();
    ensureStashSet();
    expect(fsStatStub.called).to.be.true;
    expect(pollStub.called, 'should not poll for status with --wait 0').to.be.false;
    expect(stopSpinnerStub.called).to.be.true;
    expect(stopSpinnerStub.firstCall.args[0]).to.equal('queued');
  });
});
