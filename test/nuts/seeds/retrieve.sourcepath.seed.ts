/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import { SourceTestkit } from '@salesforce/source-testkit';
import { TEST_REPOS_MAP } from '../testMatrix';

// DO NOT TOUCH. generateNuts.ts will insert these values
const REPO = TEST_REPOS_MAP.get('%REPO_URL%');
const EXECUTABLE = '%EXECUTABLE%';

context('Retrieve Sourcepath NUTs [name: %REPO_NAME%] [exec: %EXECUTABLE%]', () => {
  let testkit: SourceTestkit;

  before(async () => {
    testkit = await SourceTestkit.create({
      repository: REPO.gitUrl,
      executable: EXECUTABLE,
      nut: __filename,
    });
    await testkit.trackGlobs(testkit.packageGlobs);
    await testkit.deploy({ args: `--sourcepath ${testkit.packageNames.join(',')}` });
  });

  after(async () => {
    try {
      await testkit?.clean();
    } catch {
      // if the it fails to clean, don't throw so NUTs will pass
    }
  });

  describe('--sourcepath flag', () => {
    for (const testCase of REPO.retrieve.sourcepath) {
      const toRetrieve = path.normalize(testCase.toRetrieve);
      it(`should retrieve ${toRetrieve}`, async () => {
        await testkit.modifyLocalGlobs(testCase.toVerify);
        await testkit.retrieve({ args: `--sourcepath ${toRetrieve}` });
        await testkit.expect.filesToBeChanged(testCase.toVerify, testCase.toIgnore);
      });
    }

    it('should throw an error if the sourcepath is not valid', async () => {
      const retrieve = await testkit.retrieve({ args: '--sourcepath DOES_NOT_EXIST', exitCode: 1 });
      const expectedError = testkit.isLocalExecutable() ? 'SfdxError' : 'UnexpectedFileFound';
      testkit.expect.errorToHaveName(retrieve, expectedError);
    });
  });
});
