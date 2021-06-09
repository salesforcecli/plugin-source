/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import { SourceTestkit } from '@salesforce/source-testkit';

const EXECUTABLE = path.join(process.cwd(), 'bin', 'run');

const repo = {
  name: 'dreamhouse-lwc',
  gitUrl: 'https://github.com/trailheadapps/dreamhouse-lwc.git',
  deploy: {
    sourcepath: [
      { toDeploy: 'force-app/main/default/objects', toVerify: ['force-app/main/default/objects/**/*'] },
      {
        toDeploy: 'force-app/main/default/classes,force-app/main/default/objects',
        toVerify: ['force-app/main/default/classes/*', 'force-app/main/default/objects/**/*'],
      },
    ],
    metadata: [
      { toDeploy: 'ApexClass', toVerify: ['force-app/main/default/classes/*'] },
      {
        toDeploy: 'ApexClass,CustomObject:Broker__c',
        toVerify: ['force-app/main/default/classes/*', 'force-app/main/default/objects/Broker__c/*'],
      },
    ],
    manifest: [
      {
        toDeploy: 'force-app/main/default/classes,force-app/main/default/objects',
        toVerify: ['force-app/main/default/classes/*', 'force-app/main/default/objects/*'],
      },
    ],
  },
};

context(`REST Deploy NUTs [name: ${repo.name}] [exec: ${EXECUTABLE} ]`, () => {
  let testkit: SourceTestkit;

  before(async () => {
    process.env.SFDX_REST_DEPLOY = 'true';
    testkit = await SourceTestkit.create({
      repository: repo.gitUrl,
      executable: EXECUTABLE,
      nut: __filename,
    });
  });

  after(async () => {
    try {
      delete process.env.SFDX_REST_DEPLOY;
      await testkit?.clean();
    } catch (e) {
      // if the it fails to clean, don't throw so NUTs will pass
      // eslint-disable-next-line no-console
      console.log('Clean Failed: ', e);
    }
  });

  describe('--sourcepath ', () => {
    for (const sourcepath of repo.deploy.sourcepath) {
      const toDeploy = path.normalize(sourcepath.toDeploy);
      it(`should deploy ${toDeploy}`, async () => {
        await testkit.deploy({ args: `--sourcepath ${toDeploy}` });
        await testkit.expect.filesToBeDeployed(sourcepath.toVerify);
      });
    }
  });

  describe('--sourcepath ', () => {
    for (const metadata of repo.deploy.metadata) {
      const toDeploy = path.normalize(metadata.toDeploy);
      it(`should deploy ${toDeploy}`, async () => {
        await testkit.deploy({ args: `--metadata ${toDeploy}` });
        await testkit.expect.filesToBeDeployed(metadata.toVerify);
      });
    }
  });

  describe('--manifest flag', () => {
    for (const testCase of repo.deploy.manifest) {
      const toDeploy = path.normalize(testCase.toDeploy);
      it(`should deploy ${toDeploy}`, async () => {
        await testkit.convert({ args: `--sourcepath ${toDeploy} --outputdir out` });
        const packageXml = path.join('out', 'package.xml');

        await testkit.deploy({ args: `--manifest ${packageXml}` });
        await testkit.expect.filesToBeDeployed(testCase.toVerify);
      });
    }
  });

  describe('--checkonly flag', () => {
    const toDeploy = path.normalize(repo.deploy.sourcepath[0].toDeploy);
    it(`should checkonly deploy ${toDeploy}`, async () => {
      await testkit.deploy({
        args: `--sourcepath ${toDeploy} --checkonly --ignoreerrors`,
      });
      await testkit.expect.filesToNotBeDeployed(repo.deploy.sourcepath[0].toVerify);
    });
  });

  // TODO: once SDR v3 with async polling - update validateddeployrequestid polling
  // describe('--validateddeployrequestid', () => {
  //   it('should return an id immediately when --wait is set to 0 and deploy:report should report results', async () => {
  //     // deploy all metadata to the org so that we can run tests
  //     await testkit.deploy({ args: '--sourcepath force-app' });
  //     // running tests requires a special permission in the 'dreamhouse' permission set
  //     await testkit.assignPermissionSet({ args: '--permsetname dreamhouse' });
  //
  //     const checkOnly = await testkit.deploy({
  //       args: '--sourcepath force-app/main/default/classes --testlevel RunLocalTests --checkonly --ignoreerrors',
  //     });
  //     testkit.expect.toHaveProperty(checkOnly.result, 'id');
  //
  //     const quickDeploy = await testkit.deploy({
  //       args: `--validateddeployrequestid ${checkOnly.result.id}`,
  //     });
  //     testkit.expect.toHavePropertyAndValue(quickDeploy.result, 'status', 'Succeeded');
  //     await testkit.expect.filesToBeDeployed(testkit.packageGlobs);
  //   });
  // });
});
