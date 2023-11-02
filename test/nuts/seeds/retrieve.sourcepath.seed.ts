/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url'; // DO NOT TOUCH. generateNuts.ts will insert these values
import { SourceTestkit } from '@salesforce/source-testkit';
import { JsonMap } from '@salesforce/ts-types';
import { RepoConfig, TEST_REPOS_MAP } from '../testMatrix.js';

// DO NOT TOUCH. generateNuts.ts will insert these values
const REPO = TEST_REPOS_MAP.get('%REPO_URL%') as RepoConfig;

context('Retrieve Sourcepath NUTs [name: %REPO_NAME%]', () => {
  let testkit: SourceTestkit;

  before(async () => {
    testkit = await SourceTestkit.create({
      repository: REPO.gitUrl,
      nut: fileURLToPath(import.meta.url),
    });
    await testkit.trackGlobs(testkit.packageGlobs);
    await testkit.deploy({ args: `--source-dir ${testkit.packageNames.join(',')}` });
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
    for (const testCase of REPO.retrieve.sourcepath) {
      const toRetrieve = path.normalize(testCase.toRetrieve);
      it(`should retrieve ${toRetrieve}`, async () => {
        await testkit.modifyLocalGlobs(testCase.toVerify);
        await testkit.retrieve({ args: `--source-dir ${toRetrieve}` });
        await testkit.expect.filesToBeChanged(testCase.toVerify, testCase.toIgnore);
      });
    }

    it('should throw an error if the sourcepath is not valid', async () => {
      const retrieve = (await testkit.retrieve({ args: '--sourcepath DOES_NOT_EXIST', exitCode: 1 })) as JsonMap;
      testkit.expect.errorToHaveName(retrieve, 'SfError');
    });
  });
});
