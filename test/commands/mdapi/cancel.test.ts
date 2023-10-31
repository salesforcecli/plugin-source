/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { join } from 'node:path';
import sinon from 'sinon';
import { expect } from 'chai';
import { spyMethod, stubMethod } from '@salesforce/ts-sinon';
import { ConfigFile } from '@salesforce/core';

import { MetadataApiDeploy } from '@salesforce/source-deploy-retrieve';
import { MockTestOrgData, TestContext } from '@salesforce/core/lib/testSetup.js';
import { stubSfCommandUx, stubUx } from '@salesforce/sf-plugins-core';
import { Cancel } from '../../../src/commands/force/mdapi/deploy/cancel.js';
import { DeployCancelResultFormatter } from '../../../src/formatters/deployCancelResultFormatter.js';
import { DeployCommandResult } from '../../../src/formatters/deployResultFormatter.js';
import { getDeployResult } from '../source/deployResponses.js';
import { Stash } from '../../../src/stash.js';

describe('force:mdapi:deploy:cancel', () => {
  Cancel.id = 'force:mdapi:deploy:cancel';

  const $$ = new TestContext();
  let testOrg: MockTestOrgData;

  const defaultDir = join('my', 'default', 'package');
  const stashedDeployId = 'IMA000STASHID';

  const deployResult = getDeployResult('canceled');
  const expectedResults = deployResult.response as DeployCommandResult;
  expectedResults.deployedSource = deployResult.getFileResponses();
  expectedResults.outboundFiles = [];

  // Stubs
  let pollStub: sinon.SinonStub;
  let cancelStub: sinon.SinonStub;
  let sfCommandUxStubs: ReturnType<typeof stubSfCommandUx>;
  let stubUxStubs: ReturnType<typeof stubUx>;

  beforeEach(async () => {
    // to suppress the output of the ux in test results
    sfCommandUxStubs = stubSfCommandUx($$.SANDBOX);
    // because we're constructing a Ux and passing it to the formatter
    stubUxStubs = stubUx($$.SANDBOX);
    // stash uses the ID.  Oclif doesn't have it set on static run, so we add it manually
    testOrg = new MockTestOrgData();
    await $$.stubAuths(testOrg);
    await $$.stubConfig({ 'target-org': testOrg.username });

    stubMethod($$.SANDBOX, ConfigFile.prototype, 'get').returns({ jobid: stashedDeployId });
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    pollStub = $$.SANDBOX.stub(Cancel.prototype, 'poll').resolves({ response: expectedResults });
    stubMethod($$.SANDBOX, Cancel.prototype, 'createDeploy').returns(MetadataApiDeploy.prototype);
    cancelStub = $$.SANDBOX.stub(MetadataApiDeploy.prototype, 'cancel');
    $$.setConfigStubContents('sfdx-project.json', {
      packageDirectories: [{ fullPath: defaultDir, path: defaultDir, name: 'default' }],
    });
  });

  it('should use stashed deploy ID', async () => {
    const getStashSpy = spyMethod($$.SANDBOX, Stash, 'get');
    const result = await Cancel.run(['--json']);

    expect(result).to.deep.equal(expectedResults);
    expect(getStashSpy.called).to.equal(true);
    expect(pollStub.firstCall.args[1]).to.equal(stashedDeployId);
    expect(cancelStub.calledOnce).to.equal(true);
    expect(sfCommandUxStubs.log.callCount).to.equal(0);
    expect(stubUxStubs.log.callCount).to.equal(0);
  });

  it('should display stashed deploy ID', async () => {
    const result = await Cancel.run([]);
    expect(result).to.deep.equal(expectedResults);
  });

  it('should use the jobid flag', async () => {
    const getStashSpy = spyMethod($$.SANDBOX, Stash, 'get');
    const result = await Cancel.run(['--json', '--jobid', expectedResults.id]);

    expect(result).to.deep.equal(expectedResults);
    expect(getStashSpy.called).to.equal(false);
    expect(pollStub.firstCall.args[1]).to.equal(expectedResults.id);
    expect(cancelStub.calledOnce).to.equal(true);
  });

  it('should display the jobid flag', async () => {
    const result = await Cancel.run(['--jobid', expectedResults.id]);
    expect(result).to.deep.equal(expectedResults);
    expect(stubUxStubs.log.args.flat()).to.deep.include(`Successfully canceled ${expectedResults.id}`);
  });

  it('should display output with no --json', async () => {
    const displayStub = $$.SANDBOX.stub(DeployCancelResultFormatter.prototype, 'display');
    const getJsonStub = $$.SANDBOX.stub(DeployCancelResultFormatter.prototype, 'getJson');
    await Cancel.run([]);
    expect(displayStub.calledOnce).to.equal(true);
    expect(getJsonStub.calledOnce).to.equal(true);
  });

  it('should NOT display output with --json', async () => {
    const displayStub = $$.SANDBOX.stub(DeployCancelResultFormatter.prototype, 'display');
    const getJsonStub = $$.SANDBOX.stub(DeployCancelResultFormatter.prototype, 'getJson');
    await Cancel.run(['--json']);

    expect(displayStub.calledOnce).to.equal(false);
    expect(getJsonStub.calledOnce).to.equal(true);
    expect(sfCommandUxStubs.log.callCount).to.equal(0);
    expect(stubUxStubs.log.callCount).to.equal(0);
  });
});
