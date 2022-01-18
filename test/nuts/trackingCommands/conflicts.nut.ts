/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import * as path from 'path';
import * as fs from 'fs';
import { expect } from 'chai';

import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { AuthInfo, Connection } from '@salesforce/core';
import { ComponentStatus } from '@salesforce/source-deploy-retrieve';
import { replaceRenamedCommands } from '@salesforce/source-tracking';
import { PushResponse } from '../../../src/formatters/source/pushResultFormatter';
import { StatusResult } from '../../../src/formatters/source/statusFormatter';
import { PullResponse } from '../../../src/formatters/source/pullFormatter';

let session: TestSession;
describe('conflict detection and resolution', () => {
  before(async () => {
    session = await TestSession.create({
      project: {
        gitClone: 'https://github.com/trailheadapps/ebikes-lwc',
      },
      setupCommands: [`sfdx force:org:create -d 1 -s -f ${path.join('config', 'project-scratch-def.json')}`],
    });
  });

  after(async () => {
    await session?.zip(undefined, 'artifacts');
    await session?.clean();
  });

  it('pushes to initiate the remote', () => {
    // This would go in setupCommands but we want it to use the bin/run version
    const pushResult = execCmd<PushResponse>(replaceRenamedCommands('force:source:push --json'), {
      ensureExitCode: 0,
    }).jsonOutput.result.pushedSource;
    expect(pushResult, JSON.stringify(pushResult)).to.have.lengthOf(232);
    expect(
      pushResult.every((r) => r.state !== ComponentStatus.Failed),
      JSON.stringify(pushResult)
    ).to.equal(true);
  });

  it('edits a remote file', async () => {
    const conn = await Connection.create({
      authInfo: await AuthInfo.create({
        username: (session.setup[0] as { result: { username: string } }).result?.username,
      }),
    });
    const app = await conn.singleRecordQuery<{ Id: string; Metadata: any }>(
      "select Id, Metadata from CustomApplication where DeveloperName = 'EBikes'",
      {
        tooling: true,
      }
    );
    await conn.tooling.sobject('CustomApplication').update({
      ...app,
      Metadata: {
        ...app.Metadata,
        description: 'modified',
      },
    });
    const result = execCmd<StatusResult[]>(replaceRenamedCommands('force:source:status --json --remote'), {
      ensureExitCode: 0,
    }).jsonOutput.result;
    expect(
      result.filter((r) => r.type === 'CustomApplication'),
      JSON.stringify(result)
    ).to.have.lengthOf(1);
  });
  it('edits a local file', async () => {
    const filePath = path.join(
      session.project.dir,
      'force-app',
      'main',
      'default',
      'applications',
      'EBikes.app-meta.xml'
    );
    await fs.promises.writeFile(
      filePath,
      (await fs.promises.readFile(filePath, { encoding: 'utf-8' })).replace('Lightning App Builder', 'App Builder')
    );
  });
  it('can see the conflict in status', () => {
    const result = execCmd<StatusResult[]>(replaceRenamedCommands('force:source:status --json'), {
      ensureExitCode: 0,
    }).jsonOutput.result.filter((app) => app.type === 'CustomApplication');
    // json is not sorted.  This relies on the implementation of getConflicts()
    expect(result).to.deep.equal([
      {
        type: 'CustomApplication',
        state: 'Local Changed (Conflict)',
        fullName: 'EBikes',
        filePath: path.normalize('force-app/main/default/applications/EBikes.app-meta.xml'),
        ignored: false,
        conflict: true,
        origin: 'Local',
        actualState: 'Changed',
      },
      {
        type: 'CustomApplication',
        state: 'Remote Changed (Conflict)',
        fullName: 'EBikes',
        filePath: path.normalize('force-app/main/default/applications/EBikes.app-meta.xml'),
        ignored: false,
        conflict: true,
        origin: 'Remote',
        actualState: 'Changed',
      },
    ]);
  });

  it('gets conflict error on push', () => {
    execCmd<PushResponse>(replaceRenamedCommands('force:source:push --json'), { ensureExitCode: 1 });
  });
  it('gets conflict error on pull', () => {
    execCmd<PullResponse>(replaceRenamedCommands('force:source:pull --json'), { ensureExitCode: 1 });
  });
  it('can push with forceoverwrite', () => {
    execCmd<PushResponse>(replaceRenamedCommands('force:source:push --json --forceoverwrite'), {
      ensureExitCode: 0,
    });
  });
});
