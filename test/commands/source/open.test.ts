/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as fs from 'fs';
import { join } from 'path';
import * as sinon from 'sinon';
import { expect } from 'chai';
import { MetadataResolver, SourceComponent } from '@salesforce/source-deploy-retrieve';
import { fromStub, stubInterface, stubMethod } from '@salesforce/ts-sinon';
import { IConfig } from '@oclif/config';
import { AuthInfo, MyDomainResolver, Org, SfdxProject } from '@salesforce/core';
import { Open } from '../../../src/commands/force/source/open';
import { OpenCommandResult } from '../../../src/formatters/source/openResultFormatter';

describe('force:source:open', () => {
  const sandbox = sinon.createSandbox();
  const username = 'deploy-test@org.com';
  const flexiPageComponents = [
    {
      name: 'MyFlexiPage',
      type: {
        id: 'flexipage',
        name: 'FlexiPage',
        suffix: 'flexipage',
        directoryName: 'flexipages',
        inFolder: false,
        strictDirectoryName: false,
      },
    },
  ] as SourceComponent[];
  const layoutComponents = [
    {
      name: 'MyLayout',
      type: {
        id: 'layout',
        name: 'Layout',
        suffix: 'layout',
        directoryName: 'layouts',
        inFolder: false,
        strictDirectoryName: false,
      },
    },
  ] as SourceComponent[];
  const apexPageComponents = [
    {
      name: 'MyPage',
      type: {
        id: 'page',
        name: 'ApexPage',
        suffix: 'page',
        directoryName: 'pages',
        inFolder: false,
        strictDirectoryName: false,
      },
    },
  ] as SourceComponent[];
  const testIp = '1.1.1.1';
  const orgId = '00DJ0000003htplMAA';
  const defaultDir = join('my', 'default', 'package');
  const recordId = '0M0J0000000Q0vmKAC';
  const frontDoorUrl = 'https://my-org.salesforce.com/secur/frontdoor.jsp?sid=';
  let getComponentsFromPathStub: sinon.SinonStub;
  const oclifConfigStub = fromStub(stubInterface<IConfig>(sandbox));

  class TestOpen extends Open {
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

  const runOpenCmd = async (params: string[]) => {
    const cmd = new TestOpen(params, oclifConfigStub);
    stubMethod(sandbox, cmd, 'assignProject').callsFake(() => {
      const sfdxProjectStub = fromStub(
        stubInterface<SfdxProject>(sandbox, {
          getDefaultPackage: () => ({ path: defaultDir }),
          getUniquePackageDirectories: () => [{ fullPath: defaultDir }],
        })
      );
      cmd.setProject(sfdxProjectStub);
    });
    stubMethod(sandbox, cmd, 'assignOrg').callsFake(() => {
      const orgStub = fromStub(
        stubInterface<Org>(sandbox, {
          getUsername: () => username,
          getOrgId: () => orgId,
          getConnection: () => ({
            getAuthInfoFields: () => ({
              username,
              orgId,
            }),
            singleRecordQuery: () => ({
              Id: recordId,
            }),
          }),
        })
      );
      stubMethod(sandbox, cmd, 'openBrowser').callsFake((url: string, options: OpenCommandResult) => options);
      stubMethod(sandbox, AuthInfo, 'create').resolves({
        getOrgFrontDoorUrl: () => {
          return frontDoorUrl;
        },
      });
      stubMethod(sandbox, fs, 'existsSync').returns(true);
      getComponentsFromPathStub = stubMethod(sandbox, MetadataResolver.prototype, 'getComponentsFromPath').callsFake(
        (fsPath: string) => {
          if (fsPath.includes('flexipage')) {
            return flexiPageComponents;
          }
          if (fsPath.includes('layout')) {
            return layoutComponents;
          }
          if (fsPath.includes('page')) {
            return apexPageComponents;
          }
        }
      );
      stubMethod(sandbox, MyDomainResolver.prototype, 'resolve').resolves(testIp);
      cmd.setOrg(orgStub);
    });
    return cmd.runIt();
  };

  afterEach(() => {
    getComponentsFromPathStub.restore();
    sandbox.restore();
  });

  it('given a flexipage source file return the lightning app builder url for it', async () => {
    const sourcefile = 'force-app/main/default/flexipages/MyFlexiPage.flexipage-meta.xml';
    const result = await runOpenCmd(['--sourcefile', sourcefile, '--json', '--urlonly']);
    expect(result).to.deep.equal({
      orgId,
      username,
      url: `${frontDoorUrl}&retURL=%2FvisualEditor%2FappBuilder.app%3FpageId%3D${recordId}`,
    });
  });

  it('given a non flexipage source file return frontdoor url', async () => {
    const sourcefile = 'force-app/main/default/layouts/MyLayout.layout-meta.xml';
    const result = await runOpenCmd(['--sourcefile', sourcefile, '--json', '--urlonly']);
    expect(result).to.deep.equal({
      orgId,
      username,
      url: `${frontDoorUrl}&retURL=${encodeURIComponent(decodeURIComponent(frontDoorUrl))}`,
    });
  });

  it('given a visualforce page url return /apex/pagename', async () => {
    const sourcefile = 'force-app/main/default/pages/MyPage.page';
    const result = await runOpenCmd(['--sourcefile', sourcefile, '--json', '--urlonly']);
    expect(result).to.deep.equal({
      orgId,
      username,
      url: `${frontDoorUrl}&retURL=%2Fapex%2FMyPage`,
    });
  });
});
