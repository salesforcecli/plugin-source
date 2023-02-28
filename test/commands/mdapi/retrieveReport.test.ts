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
import { fromStub, stubInterface, stubMethod } from '@salesforce/ts-sinon';
import { Config } from '@oclif/core';

import { MetadataApiRetrieve } from '@salesforce/source-deploy-retrieve';
import { SfCommand, Ux } from '@salesforce/sf-plugins-core';
import { MockTestOrgData, TestContext } from '@salesforce/core/lib/testSetup';
import { Report } from '../../../src/commands/force/mdapi/retrieve/report';
import { Stash } from '../../../src/stash';
import { getRetrieveResult, getRetrieveResponse } from '../source/retrieveResponses';

const $$ = new TestContext();
const testOrg = new MockTestOrgData();

describe('force:mdapi:retrieve:report', () => {
  const sandbox = sinon.createSandbox();
  testOrg.username = 'report-test@org.com';
  const retrievetargetdir = path.resolve('retrieve-target-dir');
  const oclifConfigStub = fromStub(stubInterface<Config>(sandbox));
  const retrieveResult = getRetrieveResult('success');
  const defaultZipFileName = 'unpackaged.zip';
  const defaultZipFilePath = path.join(retrievetargetdir, defaultZipFileName);
  const expectedDefaultResult = Object.assign({}, retrieveResult.response, { zipFilePath: defaultZipFilePath });
  const defaultStash = {
    jobid: retrieveResult.response.id,
    zipfilename: defaultZipFileName,
    retrievetargetdir,
  };

  // Stubs
  let checkStatusStub: sinon.SinonStub;
  let postStub: sinon.SinonStub;
  let pollStatusStub: sinon.SinonStub;
  let uxLogStub: sinon.SinonStub;
  let sfCommandLogStub: sinon.SinonStub;
  let uxStyledHeaderStub: sinon.SinonStub;
  let uxTableStub: sinon.SinonStub;
  let stashSetStub: sinon.SinonStub;
  let stashGetStub: sinon.SinonStub;
  let fsStatStub: sinon.SinonStub;

  class TestReport extends Report {
    public async runIt() {
      await this.init();
      // set a Command.id for use with Stash
      this.id ??= 'force:mdapi:retrieve:report';
      return this.run();
    }
  }

  const runReportCmd = async (params: string[]) => {
    params.push('-o', testOrg.username);
    const cmd = new TestReport(params, oclifConfigStub);

    uxLogStub = stubMethod(sandbox, Ux.prototype, 'log');
    sfCommandLogStub = stubMethod(sandbox, SfCommand.prototype, 'log');
    uxStyledHeaderStub = stubMethod(sandbox, Ux.prototype, 'styledHeader');
    uxTableStub = stubMethod(sandbox, SfCommand.prototype, 'table');

    return cmd.runIt();
  };

  beforeEach(async () => {
    await $$.stubAuths(testOrg);
    sandbox.stub(fs, 'mkdirSync');
    fsStatStub = sandbox.stub(fs, 'statSync');
    fsStatStub.returns({ isDirectory: () => true });
    stashSetStub = stubMethod(sandbox, Stash, 'set');
    stashGetStub = stubMethod(sandbox, Stash, 'get');
    checkStatusStub = sandbox.stub(MetadataApiRetrieve.prototype, 'checkStatus');
    postStub = sandbox.stub(MetadataApiRetrieve.prototype, 'post');
    pollStatusStub = sandbox.stub(MetadataApiRetrieve.prototype, 'pollStatus').resolves(retrieveResult);
  });

  afterEach(() => {
    $$.restore();
    sandbox.restore();
  });

  const ensureStashGet = () => {
    expect(stashSetStub.called).to.be.false;
    expect(stashGetStub.called).to.be.true;
    expect(stashGetStub.firstCall.args[0]).to.equal('MDAPI_RETRIEVE');
  };

  it('should pass along retrievetargetdir', async () => {
    stashGetStub.returns(defaultStash);
    const result = await runReportCmd(['--retrievetargetdir', retrievetargetdir, '--json']);
    expect(result).to.deep.equal(expectedDefaultResult);
    ensureStashGet();
    expect(fsStatStub.called).to.be.true;
    // should use the default polling timeout of 1440 minutes (86400 seconds)
    expect(pollStatusStub.firstCall.args[0]).to.equal(1000);
    expect(pollStatusStub.firstCall.args[1]).to.equal(86400);
  });

  it('should pass along jobid', async () => {
    const jobid = retrieveResult.response.id;
    const result = await runReportCmd(['--retrievetargetdir', retrievetargetdir, '--jobid', jobid, '--json']);
    expect(result).to.deep.equal(expectedDefaultResult);
    expect(stashSetStub.called).to.be.false;
    expect(stashGetStub.called).to.be.false;
  });

  it('should throw if no jobid provided by flag or stash', async () => {
    try {
      await runReportCmd(['--retrievetargetdir', retrievetargetdir, '--json']);
      expect(false, 'Expected MissingRetrieveId error to be thrown').to.be.true;
    } catch (e: unknown) {
      expect((e as Error).name).to.equal('MissingRetrieveId');
    }
  });

  it('should pass along zipfilename and unzip', async () => {
    const jobid = retrieveResult.response.id;
    const zipfilename = 'foo.zip';
    const zipFilePath = path.join(retrievetargetdir, zipfilename);
    const expectedResult = Object.assign({}, retrieveResult.response, { zipFilePath });
    const result = await runReportCmd([
      '--jobid',
      jobid,
      '--retrievetargetdir',
      retrievetargetdir,
      '-n',
      zipfilename,
      '--unzip',
      '--json',
    ]);
    expect(result).to.deep.equal(expectedResult);
    expect(stashSetStub.called).to.be.false;
    expect(stashGetStub.called).to.be.false;
    expect(fsStatStub.called).to.be.true;
  });

  it('should use wait param', async () => {
    stashGetStub.returns(defaultStash);
    const result = await runReportCmd(['-w', '5', '--json']);
    expect(result).to.deep.equal(expectedDefaultResult);
    ensureStashGet();
    expect(fsStatStub.called).to.be.true;
    expect(pollStatusStub.firstCall.args[0]).to.equal(1000);
    expect(pollStatusStub.firstCall.args[1]).to.equal(300);
  });

  it('should display expected output', async () => {
    stashGetStub.returns(defaultStash);
    const result = await runReportCmd([]);
    expect(result).to.deep.equal(expectedDefaultResult);
    expect(uxLogStub.called).to.be.true;
    expect(uxLogStub.firstCall.args[0]).to.equal(`Wrote retrieve zip to ${defaultZipFilePath}`);
    expect(uxStyledHeaderStub.called).to.be.false;
    expect(uxTableStub.called).to.be.false;
  });

  it('should return verbose output', async () => {
    stashGetStub.returns(defaultStash);
    const result = await runReportCmd(['--verbose']);
    expect(result).to.deep.equal(expectedDefaultResult);
    expect(uxLogStub.called).to.be.true;
    expect(uxLogStub.firstCall.args[0]).to.equal(`Wrote retrieve zip to ${defaultZipFilePath}`);
    expect(uxStyledHeaderStub.called).to.be.true;
    expect(uxStyledHeaderStub.firstCall.args[0]).to.contain('Components Retrieved');
  });

  it('should return an async result with --wait 0', async () => {
    const inProgressResponse = getRetrieveResponse('inProgress');
    checkStatusStub.resolves(inProgressResponse);
    stashGetStub.returns(defaultStash);
    const result = await runReportCmd(['-w', '0', '--json']);
    expect(result).to.deep.equal({
      done: false,
      id: expectedDefaultResult.id,
      state: 'InProgress',
      status: 'InProgress',
      timedOut: true,
    });
    ensureStashGet();
    expect(checkStatusStub.called).to.be.true;
    expect(postStub.called).to.be.false;
    expect(fsStatStub.called).to.be.true;
    expect(pollStatusStub.called, 'should not poll for status with --wait 0').to.be.false;
    expect(sfCommandLogStub.called).to.be.true;
  });

  it('should return a normal result with --wait 0', async () => {
    stashGetStub.returns(defaultStash);
    postStub.resolves(retrieveResult);
    checkStatusStub.resolves(retrieveResult.response);
    const result = await runReportCmd(['-w', '0', '--json']);
    expect(result).to.deep.equal(expectedDefaultResult);
    ensureStashGet();
    expect(checkStatusStub.called).to.be.true;
    expect(postStub.called).to.be.true;
    expect(fsStatStub.called).to.be.true;
    expect(pollStatusStub.called, 'should not poll for status with --wait 0').to.be.false;
  });
});
