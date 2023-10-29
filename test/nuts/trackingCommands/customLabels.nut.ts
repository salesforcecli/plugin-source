/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'node:path';
import * as fs from 'node:fs';
import { expect } from 'chai';

import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { AuthInfo, Connection } from '@salesforce/core';
import { PushResponse } from '../../../src/formatters/source/pushResultFormatter';
import { PullResponse } from '../../../src/formatters/source/pullFormatter';

let session: TestSession;
describe('CustomLabel source tracking', () => {
  before(async () => {
    session = await TestSession.create({
      project: {
        sourceDir: path.join(process.cwd(), 'test', 'nuts', 'customLabelProject'),
      },
      devhubAuthStrategy: 'AUTO',
      scratchOrgs: [
        {
          setDefault: true,
          config: path.join('config', 'project-scratch-def.json'),
        },
      ],
    });
  });

  after(async () => {
    await session?.zip(undefined, 'artifacts');
    await session?.clean();
  });

  it('pushes to initiate the remote', () => {
    execCmd<PushResponse>('force:source:push --json', { ensureExitCode: 0 });
  });

  it("deletes the 'DeleteMe' CustomLabel", async () => {
    const clFile = path.join(
      session.project.dir,
      'force-app',
      'main',
      'default',
      'labels',
      'CustomLabels.labels-meta.xml'
    );
    const conn = await Connection.create({
      authInfo: await AuthInfo.create({
        username: session.orgs.get('default').username,
      }),
    });
    const id = (
      await conn.singleRecordQuery<{ Id: string }>("SELECT Id FROM CustomLabel WHERE name = 'DeleteMe'", {
        tooling: true,
      })
    ).Id;
    await conn.tooling.sobject('CustomLabel').delete(id);
    expect((await conn.tooling.query('SELECT Id FROM CustomLabel')).totalSize).to.equal(2);

    const result = execCmd<PullResponse>('force:source:pull -f --json', { ensureExitCode: 0 }).jsonOutput.result;
    expect(result.pulledSource.length).to.equal(1);
    expect(result.pulledSource[0].state).to.equal('Deleted');
    expect(result.pulledSource[0].fullName).to.equal('DeleteMe');
    expect(fs.existsSync(clFile)).to.be.true;
    expect(fs.readFileSync(clFile, { encoding: 'utf-8' })).to.not.include('DeleteMe');
    expect(fs.readFileSync(clFile, { encoding: 'utf-8' })).to.include('KeepMe1');
  });

  it('deletes the remaining CustomLabel(s) and file', async () => {
    const clFile = path.join(
      session.project.dir,
      'force-app',
      'main',
      'default',
      'labels',
      'CustomLabels.labels-meta.xml'
    );
    const conn = await Connection.create({
      authInfo: await AuthInfo.create({
        username: session.orgs.get('default').username,
      }),
    });
    const ids = (await conn.tooling.query<{ Id: string }>('SELECT Id FROM CustomLabel')).records.map((r) => r.Id);
    // deleting by passing an array of IDs was throwing an error
    // await conn.tooling.sobject('CustomLabel').delete(ids);
    expect(ids.length).to.equal(2);
    await conn.tooling.sobject('CustomLabel').delete(ids[0]);
    await conn.tooling.sobject('CustomLabel').delete(ids[1]);
    expect((await conn.tooling.query('SELECT Id FROM CustomLabel')).totalSize).to.equal(0);

    const result = execCmd<PullResponse>('force:source:pull', { ensureExitCode: 0 }).shellOutput.stdout;
    expect(fs.existsSync(clFile)).to.be.false;
    expect(result).to.contain('KeepMe1');
    expect(result).to.contain('KeepMe2');
  });
});
