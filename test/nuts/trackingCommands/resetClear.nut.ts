/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import * as path from 'path';
import * as fs from 'fs';

import { TestSession, execCmd } from '@salesforce/cli-plugins-testkit';
import { expect } from 'chai';
import { Connection, AuthInfo } from '@salesforce/core';
import { replaceRenamedCommands } from '@salesforce/source-tracking';
import { StatusResult } from '../../../src/formatters/statusFormatter';
import { SourceTrackingClearResult } from '../../../src/commands/force/source/beta/tracking/clear';

let session: TestSession;
let orgId: string;
let trackingFileFolder: string;
let conn: Connection;

// copy/pasted here to avoid exporting this type from STL
type MemberRevision = {
  serverRevisionCounter: number;
  lastRetrievedFromServer: number | null;
  memberType: string;
  isNameObsolete: boolean;
};

const getRevisionsAsArray = async (): Promise<MemberRevision[]> => {
  const revisionFile = JSON.parse(
    await fs.promises.readFile(path.join(trackingFileFolder, 'maxRevision.json'), 'utf8')
  ) as Record<string, MemberRevision>;
  return Reflect.ownKeys(revisionFile.sourceMembers).map((key) => revisionFile.sourceMembers[key] as MemberRevision);
};

describe('reset and clear', () => {
  before(async () => {
    session = await TestSession.create({
      project: {
        gitClone: 'https://github.com/trailheadapps/ebikes-lwc',
      },
      setupCommands: [`sfdx force:org:create -d 1 -s -f ${path.join('config', 'project-scratch-def.json')}`],
    });
    orgId = (session.setup[0] as { result: { orgId: string } }).result?.orgId;
    trackingFileFolder = path.join(session?.project.dir, '.sfdx', 'orgs', orgId);
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

  describe('clearing tracking', () => {
    it('runs status to start tracking', () => {
      const result = execCmd<StatusResult[]>(replaceRenamedCommands('force:source:status --json'), {
        ensureExitCode: 0,
      }).jsonOutput.result;
      expect(result).to.have.length.greaterThan(100); // ebikes is big
    });

    it('local tracking file exists', () => {
      expect(fs.existsSync(path.join(trackingFileFolder, 'localSourceTracking'))).to.equal(true);
    });
    it('remote tracking file exists', () => {
      expect(fs.existsSync(path.join(trackingFileFolder, 'maxRevision.json'))).to.equal(true);
    });
    it('runs clear', () => {
      const clearResult = execCmd<SourceTrackingClearResult>(
        replaceRenamedCommands('force:source:tracking:clear --noprompt --json'),
        {
          ensureExitCode: 0,
        }
      ).jsonOutput.result;
      expect(clearResult.clearedFiles.some((file) => file.includes('maxRevision.json'))).to.equal(true);
    });
    it('local tracking is gone', () => {
      expect(fs.existsSync(path.join(trackingFileFolder, 'localSourceTracking'))).to.equal(false);
    });
    it('remote tracking is gone', () => {
      expect(fs.existsSync(path.join(trackingFileFolder, 'maxRevision.json'))).to.equal(false);
    });
  });

  describe('reset remote tracking', () => {
    let lowestRevision: number;
    it('creates 2 apex classes to get some tracking going', async () => {
      const createResult = await conn.tooling.create('ApexClass', {
        Name: 'CreatedClass',
        Body: 'public class CreatedClass {}',
        Status: 'Active',
      });
      const createResult2 = await conn.tooling.create('ApexClass', {
        Name: 'CreatedClass2',
        Body: 'public class CreatedClass2 {}',
        Status: 'Active',
      });
      [createResult, createResult2].map((result) => {
        if (!Array.isArray(result)) {
          expect(result.success).to.equal(true);
        }
      });
      // gets tracking files from server
      execCmd(replaceRenamedCommands('force:source:status --json --remote'), { ensureExitCode: 0 });
      const revisions = await getRevisionsAsArray();
      const revisionFile = JSON.parse(
        await fs.promises.readFile(path.join(trackingFileFolder, 'maxRevision.json'), 'utf8')
      );
      lowestRevision = revisions.reduce(
        (previousValue: number, revision) => Math.min(previousValue, revision.serverRevisionCounter),
        revisionFile.serverMaxRevisionCounter
      );
      expect(lowestRevision).lessThan(revisionFile.serverMaxRevisionCounter as number);
      // revisions are not retrieved
      revisions.map((revision) => {
        expect(revision.serverRevisionCounter).to.not.equal(revision.lastRetrievedFromServer);
        expect(revision.lastRetrievedFromServer).to.equal(null);
      });
    });
    it('can reset to a known revision', async () => {
      execCmd(replaceRenamedCommands(`force:source:tracking:reset --revision ${lowestRevision} --noprompt`), {
        ensureExitCode: 0,
      });
      const revisions = await getRevisionsAsArray();

      revisions.map((revision) => {
        revision.serverRevisionCounter === lowestRevision
          ? expect(revision.serverRevisionCounter).to.equal(revision.lastRetrievedFromServer)
          : expect(revision.serverRevisionCounter).to.not.equal(revision.lastRetrievedFromServer);
      });
    });

    it('can reset to a non-specified revision (resets everything)', async () => {
      execCmd(replaceRenamedCommands(`force:source:tracking:reset --revision ${lowestRevision} --noprompt`), {
        ensureExitCode: 0,
      });
      const revisions = await getRevisionsAsArray();

      revisions.map((revision) => {
        expect(revision.serverRevisionCounter === revision.lastRetrievedFromServer).to.equal(true);
      });
    });
  });
});
