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

import { fileURLToPath } from 'node:url';
import { SourceTestkit } from '@salesforce/source-testkit';
import { get } from '@salesforce/ts-types';
import { FileResponse } from '@salesforce/source-deploy-retrieve';
import { RepoConfig, TEST_REPOS_MAP } from '../testMatrix.js';

// DO NOT TOUCH. generateNuts.ts will insert these values
const REPO = TEST_REPOS_MAP.get('%REPO_URL%') as RepoConfig;

context('Deploy metadata NUTs [name: %REPO_NAME%]', () => {
  let testkit: SourceTestkit;

  before(async () => {
    testkit = await SourceTestkit.create({
      repository: REPO.gitUrl,
      nut: fileURLToPath(import.meta.url),
    });
    // some deploys reference other metadata not included in the deploy, if it's not already in the org it will fail
    await testkit.deploy({ args: `--sourcepath ${testkit.packageNames.join(',')}` });
    // permset is only present in dreamhouse, not mpd
    if (REPO.gitUrl.includes('dreamhouse')) {
      await testkit.assignPermissionSet({ args: '--permsetname dreamhouse', cli: 'sf' });
    }
  });

  after(async () => {
    try {
      await testkit?.clean();
    } catch (e) {
      // if the it fails to clean, don't throw so NUTs will pass
      // eslint-disable-next-line no-console
      console.log('Clean Failed: ', e);
    }
  });

  describe('--metadata flag', () => {
    for (const testCase of REPO.deploy.metadata) {
      it(`should deploy ${testCase.toDeploy}`, async () => {
        const res = await testkit.deploy({ args: `--metadata ${testCase.toDeploy}` });
        const fileResponse = get(res, 'result.deployedSource') as FileResponse[];

        await testkit.expect.filesToBeDeployedViaResult(testCase.toVerify, testCase.toIgnore, fileResponse);
      });
    }

    it('should throw an error if the metadata is not valid', async () => {
      await testkit.deploy({ args: '--metadata DOES_NOT_EXIST', exitCode: 1 });
    });

    it('should not deploy metadata outside of a package directory', async () => {
      await testkit.createApexClass({ args: '--outputdir NotAPackage --classname ShouldNotBeDeployed', cli: 'sf' });
      await testkit.deploy({ args: '--metadata ApexClass' });
      // this is a glob, so no need for path.join
      await testkit.expect.filesToNotBeDeployed(['NotAPackage/**/*']);
    });
  });
});
