/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as fs from 'fs';
import * as sinon from 'sinon';
import { assert, expect } from 'chai';
import { Org } from '@salesforce/core';
import { FileProperties } from 'jsforce';
import { fromStub, stubInterface, stubMethod } from '@salesforce/ts-sinon';
import { IConfig } from '@oclif/config';
import { UX } from '@salesforce/command';
import { ListMetadata } from '../../../src/commands/force/mdapi/listmetadata';

describe('force:mdapi:listmetadata', () => {
  const sandbox = sinon.createSandbox();
  const username = 'listmetadata-test@org.com';

  const listResponse: FileProperties = {
    createdById: '0053F00000BHrxsQAD',
    createdByName: 'User User',
    createdDate: '2021-11-02T19:49:41.000Z',
    fileName: 'classes/MyApexClass.cls',
    fullName: 'MyApexClass',
    id: '01p3F00000NkdcuQAB',
    lastModifiedById: '0053F00000BHrxsQAD',
    lastModifiedByName: 'User User',
    lastModifiedDate: '2021-11-02T19:49:41.000Z',
    manageableState: 'unmanaged',
    type: 'ApexClass',
  };

  const oclifConfigStub = fromStub(stubInterface<IConfig>(sandbox));
  let listMetadataStub: sinon.SinonStub;
  let uxLogStub: sinon.SinonStub;
  let uxStyledJsonStub: sinon.SinonStub;
  let fsWriteFileStub: sinon.SinonStub;
  let fsStatStub: sinon.SinonStub;

  class TestListMetadata extends ListMetadata {
    public async runIt() {
      await this.init();
      return this.run();
    }
    public setOrg(org: Org) {
      this.org = org;
    }
  }

  const runListMetadataCmd = async (params: string[]) => {
    const cmd = new TestListMetadata(params, oclifConfigStub);
    stubMethod(sandbox, cmd, 'assignOrg').callsFake(() => {
      const orgStub = fromStub(
        stubInterface<Org>(sandbox, {
          getUsername: () => username,
          getConnection: () => ({
            metadata: {
              list: listMetadataStub,
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
    listMetadataStub = sandbox.stub();
    fsWriteFileStub = sandbox.stub(fs, 'writeFileSync');
    sandbox.stub(fs, 'mkdirSync');
    fsStatStub = sandbox.stub(fs, 'statSync');
    fsStatStub.returns({ isDirectory: () => false });
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should fail without required metadatatype flag', async () => {
    try {
      await runListMetadataCmd([]);
      assert(false, 'expected mdapi:listmetadata to error');
    } catch (e: unknown) {
      expect((e as Error).message).to.include('Missing required flag:');
    }
  });

  it('should report when no matching metadata (json)', async () => {
    listMetadataStub.resolves();
    const result = await runListMetadataCmd(['--metadatatype', 'ApexClass', '--json']);
    expect(result).to.deep.equal([]);
    expect(uxLogStub.called).to.be.false;
    expect(uxStyledJsonStub.called).to.be.false;
  });

  it('should report when no matching metadata (display)', async () => {
    listMetadataStub.resolves();
    const result = await runListMetadataCmd(['--metadatatype', 'ApexClass']);
    expect(result).to.deep.equal([]);
    expect(uxLogStub.firstCall.args[0]).to.equal(`No metadata found for type: ApexClass in org: ${username}`);
    expect(uxStyledJsonStub.called).to.be.false;
  });

  it('should report with single matching metadata (json)', async () => {
    listMetadataStub.resolves(listResponse);
    const result = await runListMetadataCmd(['--metadatatype', 'ApexClass', '--json']);
    expect(result).to.deep.equal([listResponse]);
    expect(uxLogStub.called).to.be.false;
    expect(uxStyledJsonStub.called).to.be.false;
  });

  it('should report with single matching metadata (display)', async () => {
    listMetadataStub.resolves(listResponse);
    const result = await runListMetadataCmd(['--metadatatype', 'ApexClass']);
    expect(result).to.deep.equal([listResponse]);
    expect(uxLogStub.called).to.be.false;
    expect(uxStyledJsonStub.firstCall.args[0]).to.deep.equal([listResponse]);
  });

  it('should report with multiple matching metadata', async () => {
    const listResponse2 = JSON.parse(JSON.stringify(listResponse)) as FileProperties;
    listResponse2.fileName = 'classes/MyApexClass2.cls';
    listResponse2.fullName = 'MyApexClass2';
    const response = [listResponse, listResponse2];
    listMetadataStub.resolves(response);
    const result = await runListMetadataCmd(['--metadatatype', 'ApexClass', '--json']);
    expect(result).to.deep.equal(response);
    expect(uxLogStub.called).to.be.false;
    expect(uxStyledJsonStub.called).to.be.false;
  });

  it('should report to a file (json)', async () => {
    const resultfile = 'listResults.json';
    listMetadataStub.resolves(listResponse);
    const result = await runListMetadataCmd(['--metadatatype', 'ApexClass', '--resultfile', resultfile, '--json']);
    expect(result).to.deep.equal([listResponse]);
    expect(uxLogStub.called).to.be.true; // called but not actually written to console
    expect(uxStyledJsonStub.called).to.be.false;
    expect(fsWriteFileStub.firstCall.args[0]).to.include(resultfile);
    expect(JSON.parse(fsWriteFileStub.firstCall.args[1] as string)).to.deep.equal([listResponse]);
  });

  it('should report to a file (display)', async () => {
    const resultfile = 'listResults.json';
    listMetadataStub.resolves(listResponse);
    const result = await runListMetadataCmd(['--metadatatype', 'ApexClass', '--resultfile', resultfile]);
    expect(result).to.deep.equal([listResponse]);
    expect(uxLogStub.firstCall.args[0]).to.include('Wrote result file to');
    expect(uxLogStub.firstCall.args[0]).to.include(resultfile);
    expect(uxStyledJsonStub.called).to.be.false;
    expect(fsWriteFileStub.firstCall.args[0]).to.include(resultfile);
    expect(JSON.parse(fsWriteFileStub.firstCall.args[1] as string)).to.deep.equal([listResponse]);
  });

  it('should report with a folder', async () => {
    const folder = 'testFolder';
    listMetadataStub.resolves(listResponse);
    const result = await runListMetadataCmd(['--metadatatype', 'ApexClass', '--folder', folder, '--json']);
    expect(result).to.deep.equal([listResponse]);
    expect(listMetadataStub.firstCall.args[0]).to.deep.equal({
      type: 'ApexClass',
      folder,
    });
    expect(uxLogStub.called).to.be.false;
    expect(uxStyledJsonStub.called).to.be.false;
  });

  it('should report with a specific API version', async () => {
    const apiversion = '46.0';
    listMetadataStub.resolves(listResponse);
    const result = await runListMetadataCmd(['--metadatatype', 'ApexClass', '--apiversion', apiversion, '--json']);
    expect(result).to.deep.equal([listResponse]);
    expect(listMetadataStub.firstCall.args[1]).to.equal(apiversion);
    expect(uxLogStub.called).to.be.false;
    expect(uxStyledJsonStub.called).to.be.false;
  });
});
