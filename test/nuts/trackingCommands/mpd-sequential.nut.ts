/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import * as fs from 'fs';
import { AuthInfo, Connection } from '@salesforce/core';
import { expect } from 'chai';
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { PushResponse } from '../../../src/formatters/source/pushResultFormatter';

let session: TestSession;
let conn: Connection;

describe('multiple pkgDirs deployed sequentially', () => {
  before(async () => {
    session = await TestSession.create({
      project: {
        gitClone: 'https://github.com/salesforcecli/sample-project-multiple-packages',
      },
      devhubAuthStrategy: 'AUTO',
      scratchOrgs: [
        {
          setDefault: true,
          config: path.join('config', 'project-scratch-def.json'),
        },
      ],
    });

    // set `pushPackageDirectoriesSequentially`
    const originalProject = JSON.parse(
      await fs.promises.readFile(path.join(session.project.dir, 'sfdx-project.json'), 'utf8')
    ) as Record<string, unknown>;
    await fs.promises.writeFile(
      path.join(session.project.dir, 'sfdx-project.json'),
      JSON.stringify({
        ...originalProject,
        pushPackageDirectoriesSequentially: true,
      })
    );

    conn = await Connection.create({
      authInfo: await AuthInfo.create({
        username: session.orgs.get('default').username,
      }),
    });
  });

  after(async () => {
    await session?.zip(undefined, 'artifacts');
    await session?.clean();
  });

  describe('mpd sequential', () => {
    it('pushes using MPD', () => {
      const result = execCmd<PushResponse>('force:source:push --json', {
        ensureExitCode: 0,
      }).jsonOutput.result.pushedSource;
      expect(result).to.be.an.instanceof(Array);
      // the fields should be populated
      expect(result.every((row) => row.type && row.fullName)).to.equal(true);
    });

    it('should have 4 deployments', async () => {
      const deployments = await conn.tooling.query('SELECT Id, Status, StartDate, CompletedDate FROM DeployRequest');
      // one deployment was the scratch org settings; the other 3 are the 3 pkgDirs
      expect(deployments.totalSize).to.equal(4);
    });
  });
});
