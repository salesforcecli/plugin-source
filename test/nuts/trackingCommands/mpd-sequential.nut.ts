/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/* eslint-disable no-console */

import * as path from 'path';
import { fs, AuthInfo, Connection } from '@salesforce/core';
import { expect } from 'chai';
import { TestSession, execCmd } from '@salesforce/cli-plugins-testkit';
import { replaceRenamedCommands } from '@salesforce/source-tracking';
import { PushResponse } from '../../../src/formatters/pushResultFormatter';

let session: TestSession;
let conn: Connection;

describe('end-to-end-test for tracking with an org (single packageDir)', () => {
  before(async () => {
    session = await TestSession.create({
      project: {
        gitClone: 'https://github.com/salesforcecli/sample-project-multiple-packages',
      },
      setupCommands: [`sfdx force:org:create -d 1 -s -f ${path.join('config', 'project-scratch-def.json')}`],
    });

    // set `pushPackageDirectoriesSequentially`
    const originalProject = (await fs.readJson(path.join(session.project.dir, 'sfdx-project.json'))) as Record<
      string,
      unknown
    >;
    await fs.writeJson(path.join(session.project.dir, 'sfdx-project.json'), {
      ...originalProject,
      pushPackageDirectoriesSequentially: true,
    });

    conn = await Connection.create({
      authInfo: await AuthInfo.create({
        username: (session.setup[0] as { result: { username: string } }).result?.username,
      }),
    });
  });

  after(async () => {
    await session?.zip(undefined, 'artifacts');
    await session?.clean();
  });

  describe('mpd sequential', () => {
    it('pushes using MPD', () => {
      const result = execCmd<PushResponse[]>(replaceRenamedCommands('force:source:push --json'), {
        ensureExitCode: 0,
      }).jsonOutput.result;
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
