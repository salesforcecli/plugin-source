/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import * as fs from 'fs';
import { expect } from 'chai';
import { TestSession, execCmd } from '@salesforce/cli-plugins-testkit';
import { replaceRenamedCommands } from '@salesforce/source-tracking';
import { PushResponse } from '../../../src/formatters/pushResultFormatter';
import { StatusResult } from '../../../src/formatters/statusFormatter';

let session: TestSession;
let cssPathAbsolute: string;
let cssPathRelative: string;

describe('lwc', () => {
  before(async () => {
    session = await TestSession.create({
      project: {
        gitClone: 'https://github.com/trailheadapps/ebikes-lwc',
      },
      setupCommands: [`sfdx force:org:create -d 1 -s -f ${path.join('config', 'project-scratch-def.json')}`],
    });

    cssPathRelative = path.join('force-app', 'main', 'default', 'lwc', 'heroDetails', 'heroDetails.css');
    cssPathAbsolute = path.join(session.project.dir, cssPathRelative);
  });

  after(async () => {
    await session?.zip(undefined, 'artifacts');
    await session?.clean();
  });

  it('pushes the repo to get source tracking started', () => {
    execCmd<PushResponse>(replaceRenamedCommands('force:source:push --json'), {
      ensureExitCode: 0,
    });
  });

  it('sees lwc css changes in local status', async () => {
    await fs.promises.writeFile(
      cssPathAbsolute,
      (await fs.promises.readFile(cssPathAbsolute, 'utf-8')).replace('absolute', 'relative')
    );
    const result = execCmd<StatusResult[]>(replaceRenamedCommands('force:source:status --json'), {
      ensureExitCode: 0,
    }).jsonOutput.result;
    expect(result.find((r) => r.filePath === cssPathRelative)).to.have.property('actualState', 'Changed');
  });

  it('pushes lwc css change', () => {
    const result = execCmd<PushResponse>(replaceRenamedCommands('force:source:push --json'), {
      ensureExitCode: 0,
    }).jsonOutput.result.pushedSource;
    // we get a result for each bundle member, even though only one changed
    expect(result.filter((r) => r.fullName === 'heroDetails')).to.have.length(4);
  });

  it('sees no local changes', () => {
    const result = execCmd<StatusResult[]>(replaceRenamedCommands('force:source:status --json'), {
      ensureExitCode: 0,
    }).jsonOutput.result.filter((r) => r.origin === 'Local');
    expect(result).to.have.length(0);
  });

  it("deleting an lwc sub-component should show the sub-component as 'Deleted'", async () => {
    await fs.promises.rm(cssPathAbsolute);
    const result = execCmd<StatusResult[]>(replaceRenamedCommands('force:source:status --json'), {
      ensureExitCode: 0,
    }).jsonOutput.result.find((r) => r.filePath === cssPathRelative);
    expect(result).to.deep.equal({
      fullName: 'heroDetails',
      type: 'LightningComponentBundle',
      state: 'Local Deleted',
      ignored: false,
      filePath: cssPathRelative,
      origin: 'Local',
      actualState: 'Deleted',
      conflict: false,
    });
  });

  it('pushes lwc subcomponent delete', () => {
    const result = execCmd<PushResponse>(replaceRenamedCommands('force:source:push --json'), {
      ensureExitCode: 0,
    }).jsonOutput.result.pushedSource;
    const bundleMembers = result.filter((r) => r.fullName === 'heroDetails');
    expect(bundleMembers).to.have.length(4);
    expect(bundleMembers.filter((r) => r.state === 'Deleted')).to.have.length(1);
    expect(bundleMembers.filter((r) => r.state === 'Changed')).to.have.length(3);
  });

  it('sees no local changes', () => {
    const result = execCmd<StatusResult[]>(replaceRenamedCommands('force:source:status --json'), {
      ensureExitCode: 0,
    }).jsonOutput.result.filter((r) => r.origin === 'Local');
    expect(result).to.have.length(0);
  });

  it('deletes entire component locally', async () => {
    const dependentLWCPath = path.join(session.project.dir, 'force-app', 'main', 'default', 'lwc', 'hero', 'hero.html');
    // remove the component
    await fs.promises.rm(path.join(session.project.dir, 'force-app', 'main', 'default', 'lwc', 'heroDetails'), {
      recursive: true,
      force: true,
    });

    // remove a dependency on that component
    await fs.promises.writeFile(
      dependentLWCPath,
      (await fs.promises.readFile(dependentLWCPath, 'utf-8')).replace(/<c-hero.*hero-details>/s, '')
    );
    const result = execCmd<StatusResult[]>(replaceRenamedCommands('force:source:status --json'), {
      ensureExitCode: 0,
    }).jsonOutput.result.filter((r) => r.origin === 'Local');
    expect(result).to.have.length(4);
    expect(result.filter((r) => r.actualState === 'Deleted')).to.have.length(3);
    expect(result.filter((r) => r.actualState === 'Changed')).to.have.length(1);
  });

  it('push deletes the LWC remotely', () => {
    const result = execCmd<PushResponse>(replaceRenamedCommands('force:source:push --json'), {
      ensureExitCode: 0,
    }).jsonOutput.result.pushedSource;
    // there'll also be changes for the changed Hero component html, but we've already tested changing a bundle member
    const bundleMembers = result.filter((r) => r.fullName === 'heroDetails');
    expect(bundleMembers).to.have.length(3);
    expect(
      bundleMembers.every((r) => r.state === 'Deleted'),
      JSON.stringify(bundleMembers, undefined, 2)
    ).to.be.true;
  });

  it('sees no local changes', () => {
    const result = execCmd<StatusResult[]>(replaceRenamedCommands('force:source:status --json'), {
      ensureExitCode: 0,
    }).jsonOutput.result.filter((r) => r.origin === 'Local');
    expect(result).to.have.length(0);
  });

  it('detects remote subcomponent conflicts');
});
