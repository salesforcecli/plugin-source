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
import { PushResponse } from '../../../src/formatters/source/pushResultFormatter';
import { StatusResult } from '../../../src/formatters/source/statusFormatter';
import { PullResponse } from '../../../src/formatters/source/pullFormatter';

let session: TestSession;
let conn: Connection;

const filterIgnored = (r: StatusResult): boolean => r.ignored !== true;

describe('remote changes', () => {
  before(async () => {
    session = await TestSession.create({
      project: {
        gitClone: 'https://github.com/trailheadapps/ebikes-lwc',
      },
      setupCommands: [`sfdx force:org:create -d 1 -s -f ${path.join('config', 'project-scratch-def.json')}`],
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

  describe('remote changes: delete', () => {
    it('pushes to initiate the remote', () => {
      const pushResult = execCmd<PushResponse>('force:source:push --json');
      expect(pushResult.jsonOutput?.status, JSON.stringify(pushResult)).equals(0);
      const pushedSource = pushResult.jsonOutput.result.pushedSource;
      expect(pushedSource, JSON.stringify(pushedSource)).to.have.lengthOf(230);
      expect(
        pushedSource.every((r) => r.state !== ComponentStatus.Failed),
        JSON.stringify(pushedSource.filter((r) => r.state === ComponentStatus.Failed))
      ).to.equal(true);
    });

    it('deletes on the server', async () => {
      const testClass = await conn.singleRecordQuery<{ Id: string }>(
        "select Id from ApexClass where Name = 'TestOrderController'",
        {
          tooling: true,
        }
      );
      const deleteResult = await conn.tooling.delete('ApexClass', testClass.Id);
      if (!Array.isArray(deleteResult) && deleteResult.success) {
        expect(deleteResult.id).to.be.a('string');
      }
    });
    it('local file is present', () => {
      expect(
        fs.existsSync(
          path.join(session.project.dir, 'force-app', 'main', 'default', 'classes', 'TestOrderController.cls')
        )
      ).to.equal(true);
      expect(
        fs.existsSync(
          path.join(session.project.dir, 'force-app', 'main', 'default', 'classes', 'TestOrderController.cls-meta.xml')
        )
      ).to.equal(true);
    });
    it('can see the delete in status', () => {
      const result = execCmd<StatusResult[]>('force:source:status --json --remote', {
        ensureExitCode: 0,
      }).jsonOutput.result;
      // it shows up as one class on the server, but 2 files when pulled
      expect(
        result.filter((r) => r.state.includes('Delete')),
        JSON.stringify(result)
      ).to.have.length(1);
    });
    it('does not see any change in local status', () => {
      const result = execCmd<StatusResult[]>('force:source:status --json --local', {
        ensureExitCode: 0,
      }).jsonOutput.result;
      expect(result.filter(filterIgnored)).to.deep.equal([]);
    });
    it('can pull the delete', () => {
      const result = execCmd<PullResponse>('force:source:pull --json', { ensureExitCode: 0 }).jsonOutput.result;
      // the 2 files for the apexClass, and possibly one for the Profile (depending on whether it got created in time)
      expect(result.pulledSource, JSON.stringify(result)).to.have.length.greaterThanOrEqual(2);
      expect(result.pulledSource, JSON.stringify(result)).to.have.length.lessThanOrEqual(4);
      result.pulledSource
        .filter((r) => r.fullName === 'TestOrderController')
        .map((r) => expect(r.state).to.equal('Deleted'));
    });
    it('local file was deleted', () => {
      expect(
        fs.existsSync(
          path.join(session.project.dir, 'force-app', 'main', 'default', 'classes', 'TestOrderController.cls')
        )
      ).to.equal(false);
      expect(
        fs.existsSync(
          path.join(session.project.dir, 'force-app', 'main', 'default', 'classes', 'TestOrderController.cls-meta.xml')
        )
      ).to.equal(false);
    });
    it('sees correct local and remote status', () => {
      const remoteResult = execCmd<StatusResult[]>('force:source:status --json --remote', {
        ensureExitCode: 0,
      }).jsonOutput.result;
      expect(remoteResult.filter((r) => r.state.includes('Remote Deleted'))).to.deep.equal([]);

      const localStatus = execCmd<StatusResult[]>('force:source:status --json --local', {
        ensureExitCode: 0,
      }).jsonOutput.result;
      expect(localStatus.filter(filterIgnored)).to.deep.equal([]);
    });
  });

  describe('remote changes: add', () => {
    const className = 'CreatedClass';
    it('adds on the server', async () => {
      const createResult = await conn.tooling.create('ApexClass', {
        Name: className,
        Body: 'public class CreatedClass {}',
        Status: 'Active',
      });
      if (!Array.isArray(createResult) && createResult.success) {
        expect(createResult.id).to.be.a('string');
      }
    });
    it('can see the add in status', () => {
      const result = execCmd<StatusResult[]>('force:source:status --json --remote', {
        ensureExitCode: 0,
      }).jsonOutput.result;
      expect(
        result.some((r) => r.fullName === className),
        JSON.stringify(result)
      ).to.equal(true);
    });
    it('can pull the add', () => {
      const result = execCmd<PullResponse>('force:source:pull --json', { ensureExitCode: 0 }).jsonOutput.result;
      // SDR marks all retrieves as 'Changed' even if it creates new local files.  This is different from toolbelt, which marked those as 'Created'
      result.pulledSource
        .filter((r) => r.fullName === className)
        .map((r) => expect(r.state, JSON.stringify(r)).to.equal('Created'));
    });
    it('sees correct local and remote status', () => {
      const remoteResult = execCmd<StatusResult[]>('force:source:status --json --remote', {
        ensureExitCode: 0,
      }).jsonOutput.result;
      expect(
        remoteResult.filter((r) => r.fullName === className),
        JSON.stringify(remoteResult)
      ).deep.equal([]);

      const localStatus = execCmd<StatusResult[]>('force:source:status --json --local', {
        ensureExitCode: 0,
      }).jsonOutput.result;
      expect(localStatus.filter(filterIgnored)).to.deep.equal([]);
    });
  });

  describe('remote changes: mixed', () => {
    it('all three types of changes on the server');
    it('can see the changes in status');
    it('can pull the changes');
    it('sees correct local and remote status');
  });
});
