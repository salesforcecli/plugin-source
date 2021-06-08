/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { $$, expect, test } from '@salesforce/command/lib/test';
import { fs, Org, AuthInfo } from '@salesforce/core';
import { stubMethod } from '@salesforce/ts-sinon';

const orgId = '000000000000000';
const username = 'test@test.org';
const testInstance = 'https://cs1.my.salesforce.com';
const accessToken = 'testAccessToken';
const flexiPageSourcefile = '/home/dreamhouse-lwc/force-app/main/default/flexipages/MyPage.flexipage-meta.xml';
const layouSourcefile = '/home/dreamhouse-lwc/force-app/main/default/layout/MyLayout.layout-meta.xml';
const flexiPageRecordId = '0M00R000000FmzQSAS';

describe('force:source:open', () => {
  beforeEach(async function () {
    $$.SANDBOX.restore();
    stubMethod($$.SANDBOX, Org, 'create').resolves(Org.prototype);
    stubMethod($$.SANDBOX, Org.prototype, 'getField').withArgs(Org.Fields.INSTANCE_URL).returns(testInstance);
    stubMethod($$.SANDBOX, Org.prototype, 'refreshAuth').resolves({});
    stubMethod($$.SANDBOX, Org.prototype, 'getOrgId').returns(orgId);
    stubMethod($$.SANDBOX, Org.prototype, 'getUsername').returns(username);
    stubMethod($$.SANDBOX, Org.prototype, 'getConnection').returns({
      accessToken,
      getAuthInfoFields: () => ({
        username,
        orgId,
      }),
      tooling: {
        query: () => {
          return Promise.resolve({
            size: 1,
            totalSize: 1,
            done: true,
            queryLocator: null,
            entityTypeName: 'FlexiPage',
            records: [{ Id: flexiPageRecordId }],
          });
        },
      },
    });
    stubMethod($$.SANDBOX, fs, 'fileExistsSync').callsFake((fsPath: string) => {
      if (fsPath.includes('flexipage-meta.xml')) {
        return true;
      }
      return false;
    });
    stubMethod($$.SANDBOX, AuthInfo, 'create').resolves(AuthInfo.prototype);
    stubMethod($$.SANDBOX, AuthInfo.prototype, 'getOrgFrontDoorUrl').returns(
      `${testInstance}/secur/frontdoor.jsp?sid=${accessToken}`
    );
  });
  test
    .stdout()
    .command(['force:source:open', '--sourcefile', flexiPageSourcefile, '--urlonly'])
    .it('given a flexipage source file return the lightning app builder url for it', (ctx) => {
      expect(ctx.stdout).to.include(testInstance);
      expect(ctx.stdout).to.include(encodeURIComponent(decodeURIComponent('visualEditor/appBuilder.app')));
      expect(ctx.stdout).to.include(flexiPageRecordId);
    });
  test
    .stdout()
    .command(['force:source:open', '--sourcefile', layouSourcefile, '--urlonly'])
    .it('given a non flexipage source file return frontdoor url', (ctx) => {
      expect(ctx.stdout).to.include(testInstance);
      expect(ctx.stdout).to.include(encodeURIComponent(decodeURIComponent('secur/frontdoor.jsp')));
      expect(ctx.stdout).not.to.include(encodeURIComponent(decodeURIComponent('visualEditor/appBuilder.app')));
    });
});
