/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as querystring from 'querystring';
import { expect } from '@salesforce/command/lib/test';
import { TestSession } from '@salesforce/cli-plugins-testkit';
import { execCmd } from '@salesforce/cli-plugins-testkit';
import { AnyJson, Dictionary, getString, isArray } from '@salesforce/ts-types';

const flexiPagePath = 'force-app/main/default/flexipages/Property_Explorer.flexipage-meta.xml';

describe('force:source:open', () => {
  let session: TestSession;
  let defaultUsername: string;
  let defaultUserOrgId: string;

  before(async () => {
    session = await TestSession.create({
      project: {
        gitClone: 'https://github.com/trailheadapps/dreamhouse-lwc.git',
      },
      setupCommands: [
        'sfdx force:org:create -f config/project-scratch-def.json --setdefaultusername --wait 10',
        'sfdx force:source:deploy -p force-app',
      ],
    });

    if (isArray<AnyJson>(session.setup)) {
      defaultUsername = getString(session.setup[0], 'result.username');
      defaultUserOrgId = getString(session.setup[0], 'result.orgId');
    }
  });

  after(async () => {
    await session?.clean();
  });

  describe('source open', () => {
    it('should produce the URL for a flexipage resource in json', () => {
      const result = execCmd<Dictionary>(`force:source:open -f ${flexiPagePath} --urlonly --json`, {
        ensureExitCode: 0,
      }).jsonOutput.result;
      expect(result).to.be.ok;
      expect(result).to.include({ orgId: defaultUserOrgId, username: defaultUsername });
      expect(result).to.property('url').to.include(querystring.escape('visualEditor/appBuilder.app'));
    });
    it("should produce the org's frontdoor url when edition of file is not supported", () => {
      const unsupportedFilePath = 'force-app/main/default/layouts/MyLayout.layout-meta.xml';
      const result = execCmd<Dictionary>(`force:source:open -f ${unsupportedFilePath} --urlonly --json`, {
        ensureExitCode: 0,
      }).jsonOutput.result;
      expect(result).to.be.ok;
      expect(result).to.include({ orgId: defaultUserOrgId, username: defaultUsername });
      expect(result).to.property('url').to.include(querystring.escape('secur/frontdoor.jsp'));
    });
  });
});
