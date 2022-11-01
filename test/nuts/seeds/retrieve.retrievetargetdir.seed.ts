/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { SourceTestkit } from '@salesforce/source-testkit';
import { JsonMap } from '@salesforce/ts-types';
import { TEST_REPOS_MAP } from '../testMatrix';

// DO NOT TOUCH. generateNuts.ts will insert these values
const REPO = TEST_REPOS_MAP.get('%REPO_URL%');

context('Retrieve metadata NUTs [name: %REPO_NAME%]', () => {
  let testkit: SourceTestkit;

  before(async () => {
    testkit = await SourceTestkit.create({
      repository: REPO.gitUrl,
      nut: __filename,
    });
    await testkit.trackGlobs(testkit.packageGlobs);
    await testkit.deploy({ args: `--sourcepath ${testkit.packageNames.join(',')}` });
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

  describe('--retrievetargetdir flag', () => {
    for (const testCase of REPO.retrieve.retrievetargetdir) {
      it(`should retrieve ${testCase.toRetrieve}`, async () => {
        await testkit.modifyLocalGlobs(testCase.toVerify);
        await testkit.retrieve({ args: `--retrievetargetdir targetdir --metadata ${testCase.toRetrieve}` });
        await testkit.expect.filesToBeRetrieved(testCase.toVerify, testCase.toIgnore);
      });
    }

    it('should throw an error if the metadata is not valid', async () => {
      const retrieve = (await testkit.retrieve({ args: '--retrievetargetdir targetdir --metadata DOES_NOT_EXIST', exitCode: 1 })) as JsonMap;
      testkit.expect.errorToHaveName(retrieve, 'SfError');
    });
  });
});
