/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { join } from 'path';
import * as fs from 'fs';
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { expect } from 'chai';

describe('full Profile retrieves', () => {
  let session: TestSession;
  let adminProfileContent: string;
  let profileDir: string;
  const adminProfileName = 'Admin.profile-meta.xml';

  before(async () => {
    session = await TestSession.create({
      project: {
        gitClone: 'https://github.com/WillieRuemmele/ebikes-lwc',
      },
      devhubAuthStrategy: 'AUTO',
      scratchOrgs: [
        {
          executable: 'sfdx',
          config: join('config', 'project-scratch-def.json'),
          setDefault: true,
          wait: 10,
          duration: 1,
        },
      ],
    });
    execCmd('force:source:push -f', { ensureExitCode: 0 });
    profileDir = join(session.project.dir, 'force-app', 'main', 'default', 'profiles');
    adminProfileContent = fs.readFileSync(join(profileDir, adminProfileName), 'utf-8');
  });

  after(async () => {
    await session.clean();
  });

  it('will retrieve the Admin Profile - json', async () => {
    const result = execCmd('force:source:beta:profile:retrieve --profiles Admin --json', {
      ensureExitCode: 0,
    }).jsonOutput.result;
    const updatedAdminProfile = fs.readFileSync(join(profileDir, adminProfileName), 'utf-8');
    expect(result).to.deep.equal([
      {
        name: 'Admin',
        path: join('force-app', 'main', 'default', 'profiles', 'Admin.profile-meta.xml'),
      },
    ]);

    expect(updatedAdminProfile).to.not.equal(adminProfileContent);
  });

  it('will retrieve all profiles - stdout', async () => {
    const result = execCmd('force:source:beta:profile:retrieve', {
      ensureExitCode: 0,
    }).shellOutput.stdout;
    expect(result).to.include('FILE NAME');
    expect(result).to.include('PATH');
    expect(result).to.include('Admin');
    expect(result).to.include('Cross Org Data Proxy User');
    expect(result).to.include(join('force-app', 'main', 'default', 'profiles', 'Admin.profile-meta.xml'));
    const updatedAdminProfile = fs.readFileSync(join(profileDir, adminProfileName), 'utf-8');
    expect(updatedAdminProfile).to.not.equal(adminProfileContent);
  });
});
