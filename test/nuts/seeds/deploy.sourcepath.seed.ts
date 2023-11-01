/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import path from 'node:path';
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
      nut: __filename,
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
