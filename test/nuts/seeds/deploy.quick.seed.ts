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

context('Quick Deploy NUTs [name: %REPO_NAME%] [exec: %EXECUTABLE%]', () => {
  let testkit: SourceTestkit;

  before(async () => {
    testkit = await SourceTestkit.create({
      repository: REPO.gitUrl,
      nut: fileURLToPath(import.meta.url),
    });
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

  it('should deploy validated (checkonly) deploy', async () => {
    // delete the lwc test stubs which will cause errors with the source tracking/globbing
    await testkit.deleteGlobs(['force-app/test/**/*']);
    const checkOnly = await testkit.deploy({
      args: `--sourcepath ${testkit.packageNames.join(',')} --testlevel RunLocalTests --checkonly --ignoreerrors`,
    });
    if (checkOnly?.result) {
      testkit.expect.toHaveProperty(checkOnly.result, 'id');
      await testkit.expect.filesToNotBeDeployed(testkit.packageGlobs);

      const quickDeploy = await testkit.deploy({
        args: `--validateddeployrequestid ${checkOnly.result.id}`,
      });
      testkit.expect.toHavePropertyAndValue(quickDeploy?.result ?? {}, 'status', 'Succeeded');

      const fileResponse = get(quickDeploy, 'result.deployedSource') as FileResponse[];
      await testkit.expect.filesToBeDeployedViaResult(testkit.packageGlobs, [], fileResponse);
    }
  });
});
