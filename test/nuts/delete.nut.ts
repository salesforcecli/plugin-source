/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import * as os from 'os';
import { expect } from 'chai';
import { execCmd } from '@salesforce/cli-plugins-testkit';
import { SourceTestkit } from '@salesforce/source-testkit';
import { fs } from '@salesforce/core';

describe('source:delete NUTs', () => {
  const executable = path.join(process.cwd(), 'bin', 'run');
  let testkit: SourceTestkit;

  const createApexClass = () => {
    // create and deploy an ApexClass that can be deleted without dependency issues
    const apexName = 'myApexClass';
    const output = path.join('force-app', 'main', 'default', 'classes');
    const pathToClass = path.join(testkit.projectDir, output, `${apexName}.cls`);
    execCmd(`force:apex:class:create --classname ${apexName} --outputdir ${output}`);
    execCmd(`force:source:deploy -m ApexClass:${apexName}`);
    return { apexName, output, pathToClass };
  };

  before(async () => {
    testkit = await SourceTestkit.create({
      nut: __filename,
      executable: os.platform() === 'win32' ? executable.replace(/\\/g, '\\\\') : executable,
      repository: 'https://github.com/trailheadapps/dreamhouse-lwc.git',
    });
    execCmd('force:source:deploy --sourcepath force-app');
  });

  after(async () => {
    await testkit?.clean();
  });

  it('should source:delete a static resource folder using the sourcepath param', () => {
    const pathToSR = path.join(testkit.projectDir, 'force-app', 'main', 'default', 'staticresources');
    const pathToJson = path.join(pathToSR, 'sample_data_properties.json');
    const pathToXml = path.join(pathToSR, 'sample_data_properties.resource-meta.xml');
    const response = execCmd<{ deletedSource: [{ filePath: string }] }>(
      `force:source:delete --json --noprompt --sourcepath ${pathToJson}`,
      {
        ensureExitCode: 0,
      }
    ).jsonOutput.result;
    expect(response.deletedSource).to.have.length(2);
    expect(fs.fileExistsSync(pathToJson)).to.be.false;
    expect(fs.fileExistsSync(pathToXml)).to.be.false;
  });

  it('should source:delete an ApexClass using the metadata param', () => {
    const { apexName, pathToClass } = createApexClass();
    const response = execCmd<{ deletedSource: [{ filePath: string }] }>(
      `force:source:delete --json --noprompt --metadata ApexClass:${apexName}`,
      {
        ensureExitCode: 0,
      }
    ).jsonOutput.result;
    expect(response.deletedSource).to.have.length(2);
    expect(fs.fileExistsSync(pathToClass)).to.be.false;
  });

  it('should source:delete all Prompts using the metadata param', () => {
    const response = execCmd<{ deletedSource: [{ filePath: string }] }>(
      'force:source:delete --json --noprompt --metadata Prompt',
      {
        ensureExitCode: 0,
      }
    ).jsonOutput.result;
    const pathToPrompts = path.join(testkit.projectDir, 'force-app', 'main', 'default', 'prompts');
    expect(response.deletedSource).to.have.length(3);
    // should delete directory contents
    expect(fs.readdirSync(pathToPrompts).length).to.equal(0);
  });

  it('should source:delete an ApexClass using the sourcepath param', () => {
    const { pathToClass } = createApexClass();
    const response = execCmd<{ deletedSource: [{ filePath: string }] }>(
      `force:source:delete --json --noprompt --sourcepath ${pathToClass}`,
      {
        ensureExitCode: 0,
      }
    ).jsonOutput.result;
    expect(response.deletedSource).to.have.length(2);
    expect(fs.fileExistsSync(pathToClass)).to.be.false;
  });

  it('should NOT delete local files with --checkonly', () => {
    const { apexName, pathToClass } = createApexClass();
    const response = execCmd<{ deletedSource: [{ filePath: string }]; deletes: [{ checkOnly: boolean }] }>(
      `force:source:delete --json --checkonly --noprompt --metadata ApexClass:${apexName}`,
      {
        ensureExitCode: 0,
      }
    ).jsonOutput.result;
    expect(response.deletedSource).to.have.length(2);
    expect(response.deletes[0].checkOnly).to.be.true;
    expect(fs.fileExistsSync(pathToClass)).to.be.true;
  });

  it('should run tests with a delete', async () => {
    const { pathToClass, apexName } = createApexClass();
    const response = execCmd<{
      checkOnly: boolean;
      runTestsEnabled: boolean;
    }>(`force:source:delete --json --testlevel RunAllTestsInOrg --noprompt --metadata ApexClass:${apexName}`, {
      ensureExitCode: 1,
    }).jsonOutput.result;
    // the delete operation will fail due to test failures without the 'dreamhouse' permission set assigned to the user
    expect(response.runTestsEnabled).to.be.true;
    expect(response.checkOnly).to.be.false;
    // ensure a failed delete attempt won't delete local files
    expect(fs.fileExistsSync(pathToClass)).to.be.true;
  });
});
