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
  name: 'sample-project-multiple-packages',
  gitUrl: 'https://github.com/salesforcecli/sample-project-multiple-packages.git',
  deploy: {
    sourcepath: [
      { toDeploy: '"force-app, my-app, foo-bar"', toVerify: ['force-app/**/*', 'my-app/**/*', 'foo-bar/**/*'] },
      {
        toDeploy:
          'force-app/main/default/labels/CustomLabels.labels-meta.xml,my-app/labels/CustomLabels.labels-meta.xml',
        toVerify: [
          'force-app/main/default/labels/CustomLabels.labels-meta.xml',
          'my-app/labels/CustomLabels.labels-meta.xml',
        ],
      },
      {
        toDeploy: 'force-app/main/default/labels/CustomLabels.labels-meta.xml',
        toVerify: ['force-app/main/default/labels/CustomLabels.labels-meta.xml'],
      },
    ],
    metadata: [
      { toDeploy: 'CustomObject', toVerify: ['force-app/main/default/objects/*__c/*', 'my-app/objects/*__c/*'] },
      {
        toDeploy: 'CustomLabels',
        toVerify: [
          'force-app/main/default/labels/CustomLabels.labels-meta.xml',
          'my-app/labels/CustomLabels.labels-meta.xml',
        ],
      },
    ],
    manifest: [
      { toDeploy: 'force-app', toVerify: ['force-app/**/*'] },
      // { toDeploy: '"force-app, my-app"', toVerify: ['force-app/**/*', 'my-app/**/*'] }, SDR BUG
    ],
  },
};

context(`MPD REST Deploy NUTs [name: ${repo.name}] [exec: ${EXECUTABLE} ]`, () => {
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
        await testkit.expect.filesToBeChanged(sourcepath.toVerify);
      });
    }
  });

  describe('--sourcepath ', () => {
    for (const metadata of repo.deploy.metadata) {
      const toDeploy = path.normalize(metadata.toDeploy);
      it(`should deploy ${toDeploy}`, async () => {
        await testkit.deploy({ args: `--metadata ${toDeploy}` });
        await testkit.expect.filesToBeChanged(metadata.toVerify);
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
        await testkit.expect.filesToBeChanged(testCase.toVerify);
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

  it('should run tests in org (RunAllTestsInOrg)', async () => {
    const toDeploy = path.normalize(repo.deploy.sourcepath[0].toDeploy);
    await testkit.deploy({
      args: `--sourcepath ${toDeploy}`,
    });
    await testkit.deploy({
      args: `--sourcepath ${toDeploy} --testlevel RunAllTestsInOrg`,
    });
    await testkit.expect.apexTestsToBeRun();
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
  //     await testkit.expect.filesToBeChanged(testkit.packageGlobs);
  //   });
  // });
});
