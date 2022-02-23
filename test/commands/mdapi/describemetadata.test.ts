/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as fs from 'fs';
import * as sinon from 'sinon';
import { expect } from 'chai';
import { Org } from '@salesforce/core';
import { DescribeMetadataResult } from 'jsforce';
import { fromStub, stubInterface, stubMethod } from '@salesforce/ts-sinon';
import { cloneJson } from '@salesforce/kit';
import { IConfig } from '@oclif/config';
import { UX } from '@salesforce/command';
import { RegistryAccess } from '@salesforce/source-deploy-retrieve';
import { DescribeMetadata } from '../../../src/commands/force/mdapi/describemetadata';

describe('force:mdapi:describemetadata', () => {
  const sandbox = sinon.createSandbox();
  const username = 'describemetadata-test@org.com';

  const describeResponse: DescribeMetadataResult = {
    metadataObjects: [
      {
        directoryName: 'mlPredictions',
        inFolder: false,
        metaFile: false,
        suffix: 'mlPrediction',
        xmlName: 'MLPredictionDefinition',
      },
      {
        directoryName: 'fieldRestrictionRules',
        inFolder: false,
        metaFile: false,
        suffix: 'rule',
        xmlName: 'FieldRestrictionRule',
      },
    ],
    organizationNamespace: '',
    partialSaveAllowed: true,
    testRequired: false,
  };

  const oclifConfigStub = fromStub(stubInterface<IConfig>(sandbox));
  let describeMetadataStub: sinon.SinonStub;
  let uxLogStub: sinon.SinonStub;
  let uxStyledJsonStub: sinon.SinonStub;
  let fsWriteFileStub: sinon.SinonStub;
  let fsStatStub: sinon.SinonStub;

  class TestDescribeMetadata extends DescribeMetadata {
    public async runIt() {
      await this.init();
      return this.run();
    }
    public setOrg(org: Org) {
      this.org = org;
    }
  }

  const runListMetadataCmd = async (params: string[]) => {
    const cmd = new TestDescribeMetadata(params, oclifConfigStub);
    stubMethod(sandbox, cmd, 'assignOrg').callsFake(() => {
      const orgStub = fromStub(
        stubInterface<Org>(sandbox, {
          getUsername: () => username,
          getConnection: () => ({
            metadata: {
              describe: describeMetadataStub,
            },
          }),
        })
      );
      cmd.setOrg(orgStub);
    });
    uxLogStub = stubMethod(sandbox, UX.prototype, 'log');
    uxStyledJsonStub = stubMethod(sandbox, UX.prototype, 'styledJSON');

    return cmd.runIt();
  };

  beforeEach(() => {
    describeMetadataStub = sandbox.stub();
    fsWriteFileStub = sandbox.stub(fs, 'writeFileSync');
    sandbox.stub(fs, 'mkdirSync');
    fsStatStub = sandbox.stub(fs, 'statSync');
    fsStatStub.returns({ isDirectory: () => false });
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should return correct json', async () => {
    describeMetadataStub.resolves(describeResponse);
    const result = await runListMetadataCmd(['--json']);
    expect(result).to.deep.equal(describeResponse);
    expect(uxLogStub.called).to.be.false;
    expect(uxStyledJsonStub.called).to.be.false;
  });

  it('should display correct json output', async () => {
    describeMetadataStub.resolves(describeResponse);
    const result = await runListMetadataCmd([]);
    expect(result).to.deep.equal(describeResponse);
    expect(uxLogStub.called).to.be.false;
    expect(uxStyledJsonStub.firstCall.args[0]).to.deep.equal(describeResponse);
  });

  it('should report to a file (json)', async () => {
    const resultfile = 'describeResults.json';
    describeMetadataStub.resolves(describeResponse);
    const result = await runListMetadataCmd(['--resultfile', resultfile, '--json']);
    expect(result).to.deep.equal(describeResponse);
    expect(uxLogStub.called).to.be.true; // called but not actually written to console
    expect(uxStyledJsonStub.called).to.be.false;
    expect(fsWriteFileStub.firstCall.args[0]).to.include(resultfile);
    expect(JSON.parse(fsWriteFileStub.firstCall.args[1] as string)).to.deep.equal(describeResponse);
  });

  it('should report to a file (display)', async () => {
    const resultfile = 'describeResults.json';
    describeMetadataStub.resolves(describeResponse);
    const result = await runListMetadataCmd(['--resultfile', resultfile]);
    expect(result).to.deep.equal(describeResponse);
    expect(uxLogStub.firstCall.args[0]).to.include('Wrote result file to');
    expect(uxLogStub.firstCall.args[0]).to.include(resultfile);
    expect(uxStyledJsonStub.called).to.be.false;
    expect(fsWriteFileStub.firstCall.args[0]).to.include(resultfile);
    expect(JSON.parse(fsWriteFileStub.firstCall.args[1] as string)).to.deep.equal(describeResponse);
  });

  it('should report with a specific API version', async () => {
    const apiversion = '46.0';
    describeMetadataStub.resolves(describeResponse);
    const result = await runListMetadataCmd(['--apiversion', apiversion, '--json']);
    expect(result).to.deep.equal(describeResponse);
    expect(describeMetadataStub.firstCall.args[0]).to.equal(apiversion);
    expect(uxLogStub.called).to.be.false;
    expect(uxStyledJsonStub.called).to.be.false;
  });

  it('should filter on unregistered metadata types', async () => {
    const originalResponse = cloneJson(describeResponse);
    const filteredResponse = cloneJson(describeResponse);
    filteredResponse.metadataObjects = [describeResponse.metadataObjects[0]];
    const registryStub = stubMethod(sandbox, RegistryAccess.prototype, 'getTypeByName');
    registryStub.withArgs('MLPredictionDefinition').throws();
    registryStub.withArgs('FieldRestrictionRule').returns(true);
    describeMetadataStub.resolves(originalResponse);
    const result = await runListMetadataCmd(['--filterknown', '--json']);
    expect(result).to.deep.equal(filteredResponse);
    expect(uxLogStub.called).to.be.false;
    expect(uxStyledJsonStub.called).to.be.false;
  });
});
