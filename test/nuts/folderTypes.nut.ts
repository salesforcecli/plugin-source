/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as fs from 'fs';
import * as path from 'path';
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { expect } from 'chai';

describe('metadata types that go in folders', () => {
  let session: TestSession;

  before(async () => {
    session = await TestSession.create({
      project: {
        gitClone: 'https://github.com/mshanemc/nestedFolders',
      },
      setupCommands: [
        'sfdx force:org:create -f config/project-scratch-def.json --setdefaultusername --wait 10 --durationdays 1',
      ],
    });
  });

  after(async () => {
    await session?.clean();
  });

  describe('emailTemplates', () => {
    after(async () => {
      await fs.promises.unlink(path.join(session.project.dir, 'package.xml'));
    });

    it('can generate manifest for just the emailTemplates', () => {
      execCmd('force:source:manifest:create -p force-app/main/default/email --json', { ensureExitCode: 0 });
      expect(fs.existsSync(path.join(session.project.dir, 'package.xml'))).to.be.true;
    });

    it('can deploy email templates via the manifest', () => {
      const deployResults = execCmd('force:source:deploy -x package.xml --json').jsonOutput;
      expect(deployResults.status, JSON.stringify(deployResults)).to.equal(0);
    });
  });

  describe('reports', () => {
    after(async () => {
      await fs.promises.unlink(path.join(session.project.dir, 'package.xml'));
    });

    it('can generate manifest for just the reports', () => {
      expect(fs.existsSync(path.join(session.project.dir, 'package.xml'))).to.be.false;
      execCmd('force:source:manifest:create -p force-app/main/default/reports --json', { ensureExitCode: 0 });
      expect(fs.existsSync(path.join(session.project.dir, 'package.xml'))).to.be.true;
    });

    it('can deploy reports via the manifest', () => {
      const deployResults = execCmd('force:source:deploy -x package.xml --json').jsonOutput;
      expect(deployResults.status, JSON.stringify(deployResults)).to.equal(0);
    });
  });
});
