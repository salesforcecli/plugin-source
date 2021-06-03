/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as sinon from 'sinon';
import { expect } from 'chai';
import { fs, SfdxProject } from '@salesforce/core';
import { stubMethod } from '@salesforce/ts-sinon';
import getTypeDefinitionByFileName /* , { TypeDefObjs } */ from '../../src/utils/getTypeDefinitionByFileName';

describe('getTypeDefinitionByFileName', () => {
  const sandbox = sinon.createSandbox();

  let fileExistsSyncStub: sinon.SinonStub;
  let resolveProjectPathSyncStub: sinon.SinonStub;

  afterEach(() => {
    sandbox.restore();
  });

  beforeEach(() => {
    fileExistsSyncStub = stubMethod(sandbox, fs, 'existsSync');
    resolveProjectPathSyncStub = stubMethod(sandbox, SfdxProject, 'resolveProjectPathSync');
  });

  it('correctly detects FlexiPage type', () => {
    const filePath = '/home/dreamhouse-lwc/force-app/main/default/flexipages/MyPage.flexipage-meta.xml';
    fileExistsSyncStub.returns(false);
    resolveProjectPathSyncStub.returns('/home/dreamhouse-lwc');
    const type = getTypeDefinitionByFileName(filePath);

    expect(type).to.have.property('metadataName');
    expect(type.metadataName).to.equal('FlexiPage');
  });

  it('correctly detects Layout of documents', () => {
    const filePath = '/home/dreamhouse-lwc/force-app/main/default/layouts/MyLayout.layout-meta.xml';
    fileExistsSyncStub.returns(false);
    resolveProjectPathSyncStub.returns('/home/dreamhouse-lwc');
    const type = getTypeDefinitionByFileName(filePath);

    expect(type).to.have.property('metadataName');
    expect(type.metadataName).to.equal('Layout');
  });
});
