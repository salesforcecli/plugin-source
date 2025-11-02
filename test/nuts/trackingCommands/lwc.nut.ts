/*
 * Copyright 2025, Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import path from 'node:path';
import fs from 'node:fs';
import { expect } from 'chai';
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { ComponentStatus } from '@salesforce/source-deploy-retrieve';
import { PushResponse } from '../../../src/formatters/source/pushResultFormatter.js';
import { StatusResult } from '../../../src/formatters/source/statusFormatter.js';

let session: TestSession;
let cssPathAbsolute: string;
let cssPathRelative: string;

const filterIgnored = (r: StatusResult): boolean => r.ignored !== true;

describe('lwc', () => {
  before(async () => {
    session = await TestSession.create({
      project: {
        gitClone: 'https://github.com/trailheadapps/ebikes-lwc',
      },
      devhubAuthStrategy: 'AUTO',
      scratchOrgs: [
        {
          setDefault: true,
          config: path.join('config', 'project-scratch-def.json'),
        },
      ],
    });

    cssPathRelative = path.join('force-app', 'main', 'default', 'lwc', 'heroDetails', 'heroDetails.css');
    cssPathAbsolute = path.join(session.project.dir, cssPathRelative);
  });

  after(async () => {
    await session?.zip(undefined, 'artifacts');
    await session?.clean();
  });

  it('pushes the repo to get source tracking started', () => {
    const resp = execCmd<PushResponse>('force:source:push --json');
    expect(resp.jsonOutput?.status, JSON.stringify(resp)).equals(0);
  });

  it('sees lwc css changes in local status', async () => {
    await fs.promises.writeFile(
      cssPathAbsolute,
      (await fs.promises.readFile(cssPathAbsolute, 'utf-8')).replace('absolute', 'relative')
    );
    const result = execCmd<StatusResult[]>('force:source:status --json', {
      ensureExitCode: 0,
    }).jsonOutput?.result;
    expect(result?.find((r) => r.filePath === cssPathRelative)).to.have.property('actualState', 'Changed');
  });

  it('pushes lwc css change', () => {
    const result = execCmd<PushResponse>('force:source:push --json', {
      ensureExitCode: 0,
    }).jsonOutput?.result.pushedSource;
    // we get a result for each bundle member, even though only one changed
    expect(result?.filter((r) => r.fullName === 'heroDetails')).to.have.length(4);
  });

  it('sees no local changes', () => {
    const result = execCmd<StatusResult[]>('force:source:status --json', {
      ensureExitCode: 0,
    })
      .jsonOutput?.result.filter((r) => r.origin === 'Local')
      .filter(filterIgnored);
    expect(result).to.have.length(0);
  });

  it("deleting an lwc sub-component should show the sub-component as 'Deleted'", async () => {
    await fs.promises.rm(cssPathAbsolute);
    const result = execCmd<StatusResult[]>('force:source:status --json', {
      ensureExitCode: 0,
    })
      .jsonOutput?.result.filter(filterIgnored)
      .find((r) => r.filePath === cssPathRelative);
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
    const result = execCmd<PushResponse>('force:source:push --json', {
      ensureExitCode: 0,
    }).jsonOutput?.result.pushedSource;
    const bundleMembers = result?.filter((r) => r.fullName === 'heroDetails');
    expect(bundleMembers).to.have.length(4);
    expect(bundleMembers?.filter((r) => r.state === ComponentStatus.Deleted)).to.have.length(1);
    expect(bundleMembers?.filter((r) => r.state === ComponentStatus.Changed)).to.have.length(3);
  });

  it('sees no local changes', () => {
    const result = execCmd<StatusResult[]>('force:source:status --json', {
      ensureExitCode: 0,
    })
      .jsonOutput?.result.filter((r) => r.origin === 'Local')
      .filter(filterIgnored);
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
    const result = execCmd<StatusResult[]>('force:source:status --json', {
      ensureExitCode: 0,
    }).jsonOutput?.result.filter((r) => r.origin === 'Local');
    expect(result?.filter(filterIgnored)).to.have.length(4);
    expect(result?.filter(filterIgnored).filter((r) => r.actualState === 'Deleted')).to.have.length(3);
    expect(result?.filter(filterIgnored).filter((r) => r.actualState === 'Changed')).to.have.length(1);
  });

  it('push deletes the LWC remotely', () => {
    const result = execCmd<PushResponse>('force:source:push --json', {
      ensureExitCode: 0,
    }).jsonOutput?.result.pushedSource;
    // there'll also be changes for the changed Hero component html, but we've already tested changing a bundle member
    const bundleMembers = result?.filter((r) => r.fullName === 'heroDetails');
    expect(bundleMembers).to.have.length(3);
    expect(
      bundleMembers?.every((r) => r.state === ComponentStatus.Deleted),
      JSON.stringify(bundleMembers, undefined, 2)
    ).to.be.true;
  });

  it('sees no local changes', () => {
    const result = execCmd<StatusResult[]>('force:source:status --json', {
      ensureExitCode: 0,
    })
      .jsonOutput?.result.filter((r) => r.origin === 'Local')
      .filter(filterIgnored);
    expect(result).to.have.length(0);
  });

  it('detects remote subcomponent conflicts');
});
