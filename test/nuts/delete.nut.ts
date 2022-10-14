/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as fs from 'fs';
import * as path from 'path';
import { expect } from 'chai';
import { execCmd } from '@salesforce/cli-plugins-testkit';
import { SourceTestkit } from '@salesforce/source-testkit';
import { exec } from 'shelljs';
import { FileResponse } from '@salesforce/source-deploy-retrieve';
import { isNameObsolete } from './shared/isNameObsolete';

describe('source:delete NUTs', () => {
  let testkit: SourceTestkit;

  const queryOrgAndFS = async (name: string, fsPath: string): Promise<void> => {
    // ensure the LWC is still in the org
    expect(await isNameObsolete(testkit.username, 'LightningComponentBundle', name)).to.be.false;
    // while the helper.js file was deleted
    expect(fs.existsSync(fsPath)).to.be.false;
  };

  const createApexClass = () => {
    // create and deploy an ApexClass that can be deleted without dependency issues
    const apexName = 'myApexClass';
    const output = path.join('force-app', 'main', 'default', 'classes');
    const pathToClass = path.join(testkit.projectDir, output, `${apexName}.cls`);
    execCmd(`force:apex:class:create --classname ${apexName} --outputdir ${output}`, { ensureExitCode: 0 });
    execCmd(`force:source:deploy -m ApexClass:${apexName}`, { ensureExitCode: 0 });
    return { apexName, output, pathToClass };
  };

  before(async () => {
    testkit = await SourceTestkit.create({
      nut: __filename,
      repository: 'https://github.com/trailheadapps/dreamhouse-lwc.git',
    });
    execCmd('force:source:deploy --sourcepath force-app', { ensureExitCode: 0 });
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
    expect(fs.existsSync(pathToJson)).to.be.false;
    expect(fs.existsSync(pathToXml)).to.be.false;
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
    expect(fs.existsSync(pathToClass)).to.be.false;
  });

  it('should source:delete all Prompts using the sourcepath param', () => {
    const response = execCmd<{ deletedSource: [{ filePath: string }] }>(
      `force:source:delete --json --noprompt --sourcepath ${path.join('force-app', 'main', 'default', 'prompts')}`,
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
    expect(fs.existsSync(pathToClass)).to.be.false;
  });

  it('should source:delete a remote-only ApexClass from the org', async () => {
    const { apexName, pathToClass } = createApexClass();
    const query = () => JSON.parse(
        exec(
          `sfdx force:data:soql:query -q "SELECT IsNameObsolete FROM SourceMember WHERE MemberType='ApexClass' AND MemberName='${apexName}' LIMIT 1" -t --json`,
          { silent: true }
        )
      ) as { result: { records: Array<{ IsNameObsolete: boolean }> } };

    let soql = query();
    // the ApexClass is present in the org
    expect(soql.result.records[0].IsNameObsolete).to.be.false;
    await testkit.deleteGlobs(['force-app/main/default/classes/myApexClass.*']);
    const response = execCmd<{ deletedSource: [{ filePath: string }] }>(
      `force:source:delete --json --noprompt --metadata ApexClass:${apexName}`,
      {
        ensureExitCode: 0,
      }
    ).jsonOutput.result;
    // remote only delete won't have an associated filepath
    expect(response.deletedSource).to.have.length(0);
    expect(fs.existsSync(pathToClass)).to.be.false;
    soql = query();
    // the apex class has been deleted in the org
    expect(soql.result.records[0].IsNameObsolete).to.be.true;
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
    expect(fs.existsSync(pathToClass)).to.be.true;
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
    expect(fs.existsSync(pathToClass)).to.be.true;
  });

  it('should delete a bundle component and deploy as a "new" bundle', async () => {
    // use the brokerCard LWC
    const lwcPath = path.join(testkit.projectDir, 'force-app', 'main', 'default', 'lwc', 'brokerCard', 'helper.js');
    fs.writeFileSync(lwcPath, '//', { encoding: 'utf8' });
    execCmd(`force:source:deploy -p ${lwcPath}`);
    const deleteResult = execCmd<{ deletedSource: [FileResponse] }>(
      `force:source:delete -p ${lwcPath} --noprompt --json`
    ).jsonOutput.result;

    expect(deleteResult.deletedSource.length).to.equal(1);
    expect(deleteResult.deletedSource[0].filePath, 'filepath').to.include(lwcPath);
    expect(deleteResult.deletedSource[0].fullName, 'fullname').to.include(path.join('brokerCard', 'helper.js'));
    expect(deleteResult.deletedSource[0].state, 'state').to.equal('Deleted');
    expect(deleteResult.deletedSource[0].type, 'type').to.equal('LightningComponentBundle');

    await queryOrgAndFS('brokerCard', lwcPath);
  });

  it('should delete a bundle component and deploy as a "new" bundle to two different bundles', async () => {
    // use the brokerCard and daysOnMarket LWC each with a helper.js file
    const lwcPath1 = path.join(testkit.projectDir, 'force-app', 'main', 'default', 'lwc', 'brokerCard', 'helper.js');
    const lwcPath2 = path.join(testkit.projectDir, 'force-app', 'main', 'default', 'lwc', 'daysOnMarket', 'helper.js');
    fs.writeFileSync(lwcPath1, '//', { encoding: 'utf8' });
    fs.writeFileSync(lwcPath2, '//', { encoding: 'utf8' });
    execCmd(`force:source:deploy -p ${lwcPath1},${lwcPath2}`);
    // delete both helper.js files at the same time
    const deleteResult = execCmd<{ deletedSource: FileResponse[] }>(
      `force:source:delete -p "${lwcPath1},${lwcPath2}" --noprompt --json`
    ).jsonOutput.result;

    expect(deleteResult.deletedSource.length).to.equal(2);
    expect(deleteResult.deletedSource[0].filePath, 'filepath').to.include(lwcPath1);
    expect(deleteResult.deletedSource[0].fullName, 'fullname').to.include(path.join('brokerCard', 'helper.js'));
    expect(deleteResult.deletedSource[0].state, 'state').to.equal('Deleted');
    expect(deleteResult.deletedSource[0].type, 'type').to.equal('LightningComponentBundle');

    expect(deleteResult.deletedSource[1].filePath, 'filepath').to.include(lwcPath2);
    expect(deleteResult.deletedSource[1].fullName, 'fullname').to.include(path.join('daysOnMarket', 'helper.js'));
    expect(deleteResult.deletedSource[1].state, 'state').to.equal('Deleted');
    expect(deleteResult.deletedSource[1].type, 'type').to.equal('LightningComponentBundle');

    await queryOrgAndFS('brokerCard', lwcPath1);
    await queryOrgAndFS('daysOnMarket', lwcPath2);
  });

  it('should delete an entire LWC', async () => {
    const lwcPath = path.join(testkit.projectDir, 'force-app', 'main', 'default', 'lwc');
    const mylwcPath = path.join(lwcPath, 'mylwc');
    execCmd(`force:lightning:component:create -n mylwc --type lwc -d ${lwcPath}`);
    execCmd(`force:source:deploy -p ${mylwcPath}`);
    expect(await isNameObsolete(testkit.username, 'LightningComponentBundle', 'mylwc')).to.be.false;
    const deleteResult = execCmd<{ deletedSource: [FileResponse] }>(
      `force:source:delete -p ${mylwcPath} --noprompt --json`
    ).jsonOutput.result;

    expect(deleteResult.deletedSource.length).to.equal(3);
    expect(deleteResult.deletedSource[0].filePath, 'filepath').to.include(mylwcPath);
    expect(deleteResult.deletedSource[0].fullName, 'fullname').to.include(path.join('mylwc'));
    expect(deleteResult.deletedSource[0].state, 'state').to.equal('Deleted');
    expect(deleteResult.deletedSource[0].type, 'type').to.equal('LightningComponentBundle');

    expect(fs.existsSync(mylwcPath)).to.be.false;
    expect(await isNameObsolete(testkit.username, 'LightningComponentBundle', 'mylwc')).to.be.true;
  });

  it('a failed delete will NOT delete files locally', async () => {
    const lwcPath = path.join(testkit.projectDir, 'force-app', 'main', 'default', 'lwc');
    const brokerPath = path.join(lwcPath, 'brokerCard');
    const deleteResult = execCmd<{ deletedSource: [FileResponse & { error: string }] }>(
      `force:source:delete -p ${brokerPath} --noprompt --json`,
      { ensureExitCode: 1 }
    ).jsonOutput.result;

    expect(deleteResult.deletedSource.length).to.equal(1);
    expect(deleteResult.deletedSource[0].fullName, 'fullname').to.include(path.join('brokerCard'));
    expect(deleteResult.deletedSource[0].state, 'state').to.equal('Failed');
    expect(deleteResult.deletedSource[0].type, 'type').to.equal('LightningComponentBundle');
    expect(deleteResult.deletedSource[0].error, 'error').to.include(
      'Referenced by a component instance inside the Lightning page Property Record Page : Lightning Page.'
    );

    expect(await isNameObsolete(testkit.username, 'LightningComponentBundle', 'brokerCard')).to.be.false;
    expect(fs.existsSync(brokerPath)).to.be.true;
  });
});
