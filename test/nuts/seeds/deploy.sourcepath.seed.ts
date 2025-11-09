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
import { fileURLToPath } from 'node:url';
import { SourceTestkit } from '@salesforce/source-testkit';
import { get } from '@salesforce/ts-types';
import { FileResponse } from '@salesforce/source-deploy-retrieve';
import { RepoConfig, TEST_REPOS_MAP } from '../testMatrix.js';

// DO NOT TOUCH. generateNuts.ts will insert these values
const REPO = TEST_REPOS_MAP.get('%REPO_URL%') as RepoConfig;

context('Deploy sourcepath NUTs [name: %REPO_NAME%]', () => {
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

  describe('--sourcepath flag', () => {
    for (const testCase of REPO.deploy.sourcepath) {
      const toDeploy = path.normalize(testCase.toDeploy);
      it(`should deploy ${toDeploy}`, async () => {
        const res = await testkit.deploy({ args: `--sourcepath ${toDeploy}` });
        const fileResponse = get(res, 'result.deployedSource') as FileResponse[];

        await testkit.expect.filesToBeDeployedViaResult(testCase.toVerify, testCase.toIgnore, fileResponse);
      });
    }

    it('should throw an error if the sourcepath is not valid', async () => {
      const deploy = await testkit.deploy({ args: '--sourcepath DOES_NOT_EXIST', exitCode: 1 });
      testkit.expect.errorToHaveName(deploy ?? {}, 'SfError');
      try {
        // old message, can be removed after SDR strict mode PR is merged
        testkit.expect.errorToHaveMessage(deploy ?? {}, 'not a valid source file path');
      } catch (e) {
        // new message
        testkit.expect.errorToHaveMessage(deploy ?? {}, 'File or folder not found');
      }
    });
  });
});
