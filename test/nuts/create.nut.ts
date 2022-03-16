/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as fs from 'fs';
import { join } from 'path';
import { expect } from '@salesforce/command/lib/test';
import { TestSession } from '@salesforce/cli-plugins-testkit';
import { execCmd } from '@salesforce/cli-plugins-testkit';
import { Dictionary } from '@salesforce/ts-types';

describe('force:source:manifest:create', () => {
  let session: TestSession;
  const orgAlias = 'smc';

  before(async () => {
    session = await TestSession.create({
      project: {
        gitClone: 'https://github.com/trailheadapps/dreamhouse-lwc.git',
      },
      setupCommands: [`sfdx force:org:create -f config/project-scratch-def.json -a ${orgAlias} -s -w 10 -d 1`],
    });
  });

  after(async () => {
    await session?.clean();
  });

  it('should produce a manifest (package.xml) for ApexClass', () => {
    const result = execCmd<Dictionary>('force:source:manifest:create --metadata ApexClass --json', {
      ensureExitCode: 0,
    }).jsonOutput.result;
    expect(result).to.be.ok;
    expect(result).to.include({ path: 'package.xml', name: 'package.xml' });
  });

  it('should produce a manifest (destructiveChanges.xml) for ApexClass in a new directory', () => {
    const apexManifest =
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<Package xmlns="http://soap.sforce.com/2006/04/metadata">\n' +
      '    <types>\n' +
      '        <members>*</members>\n' +
      '        <name>ApexClass</name>\n' +
      '    </types>\n' +
      '    <version>51.0</version>\n' +
      '</Package>';

    const output = join('abc', 'def');
    const outputFile = join(output, 'destructiveChanges.xml');
    const result = execCmd<Dictionary>(
      `force:source:manifest:create --metadata ApexClass --manifesttype destroy --outputdir ${output} --apiversion=51.0 --json`,
      {
        ensureExitCode: 0,
      }
    ).jsonOutput.result;
    expect(result).to.be.ok;
    expect(result).to.include({ path: `${outputFile}`, name: 'destructiveChanges.xml' });
    const file = fs.readFileSync(join(session.project.dir, outputFile), 'utf-8');
    expect(file).to.include(apexManifest);
  });

  it('should produce a custom manifest (myNewManifest.xml) for a sourcepath', () => {
    const output = join('abc', 'def');
    const outputFile = join(output, 'myNewManifest.xml');
    const result = execCmd<Dictionary>(
      `force:source:manifest:create --metadata ApexClass --manifestname myNewManifest --outputdir ${output} --json`,
      {
        ensureExitCode: 0,
      }
    ).jsonOutput.result;
    expect(result).to.be.ok;
    expect(result).to.include({ path: `${outputFile}`, name: 'myNewManifest.xml' });
  });

  it('should produce a manifest in a directory with stdout output', () => {
    const output = join('abc', 'def');
    const result = execCmd<Dictionary>(`force:source:manifest:create --metadata ApexClass --outputdir ${output}`, {
      ensureExitCode: 0,
    }).shellOutput;
    expect(result).to.include(`successfully wrote package.xml to ${output}`);
  });

  it('should produce a manifest with stdout output', () => {
    const result = execCmd<Dictionary>('force:source:manifest:create --metadata ApexClass', {
      ensureExitCode: 0,
    }).shellOutput;
    expect(result).to.include('successfully wrote package.xml');
  });

  it('should produce a manifest from metadata in an org', async () => {
    const manifestName = 'org-metadata.xml';
    const result = execCmd<Dictionary>(`force:source:manifest:create --fromorg ${orgAlias} -n ${manifestName} --json`, {
      ensureExitCode: 0,
    }).jsonOutput.result;
    expect(result).to.be.ok;
    expect(result).to.include({ path: manifestName, name: manifestName });
    const stats = fs.statSync(join(session.project.dir, manifestName));
    expect(stats.isFile()).to.be.true;
    expect(stats.size).to.be.greaterThan(100);
  });
});
