/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import { SourceTestkit } from '@salesforce/source-testkit';
import { get } from '@salesforce/ts-types';
import { FileResponse } from '@salesforce/source-deploy-retrieve';
import { expect } from 'chai';
import { DeployCommandResult } from '../../../src/formatters/deployResultFormatter';
import { DeployReportCommandResult } from '../../../src/formatters/deployReportResultFormatter';

const repo = {
  name: 'sample-project-multiple-packages',
  gitUrl: 'https://github.com/salesforcecli/sample-project-multiple-packages.git',
  deploy: {
    sourcepath: [
      {
        toDeploy: '"force-app, my-app, foo-bar"',
        toVerify: ['force-app/**/*', 'my-app/**/*', 'foo-bar/**/*'],
        toIgnore: [] as string[],
      },
      {
        toDeploy:
          'force-app/main/default/labels/CustomLabels.labels-meta.xml,my-app/labels/CustomLabels.labels-meta.xml',
        toVerify: [
          'force-app/main/default/labels/CustomLabels.labels-meta.xml',
          'my-app/labels/CustomLabels.labels-meta.xml',
        ],
        toIgnore: [] as string[],
      },
      {
        toDeploy: 'force-app/main/default/labels/CustomLabels.labels-meta.xml',
        toVerify: ['force-app/main/default/labels/CustomLabels.labels-meta.xml'],
        toIgnore: [] as string[],
      },
    ],
    metadata: [
      {
        toDeploy: 'CustomObject',
        toVerify: ['force-app/main/default/objects/**/*', 'my-app/objects/**/*'],
        toIgnore: [] as string[],
      },
      {
        toDeploy: 'CustomLabels',
        toVerify: [
          'force-app/main/default/labels/CustomLabels.labels-meta.xml',
          'my-app/labels/CustomLabels.labels-meta.xml',
        ],
        toIgnore: [] as string[],
      },
    ],
    manifest: [
      {
        toDeploy: 'force-app',
        toVerify: [
          'force-app/**/*',
          'force-app/main/default/labels/CustomLabels.labels-meta.xml',
          'my-app/labels/CustomLabels.labels-meta.xml',
          'my-app/objects/MyObj__c/fields/MyField__c.field-meta.xml',
        ],
        toIgnore: [] as string[],
      },
      // { toDeploy: '"force-app, my-app"', toVerify: ['force-app/**/*', 'my-app/**/*'] }, SDR BUG
    ],
  },
};

context(`MPD REST Deploy NUTs [name: ${repo.name}]`, () => {
  let testkit: SourceTestkit;

  before(async () => {
    process.env.SFDX_REST_DEPLOY = 'true';
    testkit = await SourceTestkit.create({
      repository: repo.gitUrl,
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
        const res = await testkit.deploy({ args: `--sourcepath ${toDeploy}` });
        const fileResponse = get(res, 'result.deployedSource') as FileResponse[];

        await testkit.expect.filesToBeDeployedViaResult(sourcepath.toVerify, sourcepath.toIgnore, fileResponse);
      });
    }
  });

  describe('--metadata ', () => {
    for (const metadata of repo.deploy.metadata) {
      const toDeploy = path.normalize(metadata.toDeploy);
      it(`should deploy ${toDeploy}`, async () => {
        const res = await testkit.deploy({ args: `--metadata ${toDeploy}` });
        const fileResponse = get(res, 'result.deployedSource') as FileResponse[];

        await testkit.expect.filesToBeDeployedViaResult(metadata.toVerify, metadata.toIgnore, fileResponse);
      });
    }
  });
  describe('--manifest flag', () => {
    for (const manifest of repo.deploy.manifest) {
      const toDeploy = path.normalize(manifest.toDeploy);
      it(`should deploy ${toDeploy}`, async () => {
        await testkit.convert({ args: `--sourcepath ${toDeploy} --outputdir out` });
        const packageXml = path.join('out', 'package.xml');

        const res = await testkit.deploy({ args: `--manifest ${packageXml}` });
        const fileResponse = get(res, 'result.deployedSource') as FileResponse[];

        await testkit.expect.filesToBeDeployedViaResult(manifest.toVerify, manifest.toIgnore, fileResponse);
      });
    }
  });

  describe('--checkonly flag', () => {
    const toDeploy = path.normalize(repo.deploy.sourcepath[0].toDeploy);
    it(`should checkonly deploy ${toDeploy}`, async () => {
      await testkit.deploy({
        args: `--sourcepath ${toDeploy} -c -o`,
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

  describe('--validateddeployrequestid', () => {
    it('should return an id immediately when --wait is set to 0 and deploy:report should report results', async () => {
      // deploy all metadata to the org so that we can run tests
      await testkit.deploy({ args: '--sourcepath force-app' });

      const classes = path.join('foo-bar', 'app', 'classes');

      const checkOnly = (await testkit.deploy({
        args: `-p ${classes} --testlevel RunAllTestsInOrg --checkonly --ignoreerrors --wait 0`,
      })) as { result: DeployCommandResult };

      // quick deploy won't work unless the checkonly has finished successfully
      const waitResult = (await testkit.deployReport({
        args: `--wait 60 --jobid ${checkOnly.result.id}`,
      })) as unknown as { status: number; result: DeployReportCommandResult };

      expect(waitResult.status, JSON.stringify(waitResult)).to.equal(0);

      const quickDeploy = (await testkit.deploy({
        args: `--validateddeployrequestid ${checkOnly.result.id}`,
      })) as { result: DeployCommandResult };

      expect(quickDeploy.result.status).to.equal('Succeeded');
      await testkit.expect.filesToBeDeployedViaResult(testkit.packageGlobs, [], quickDeploy.result.deployedSource);
    });
  });
});
