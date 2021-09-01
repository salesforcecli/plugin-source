/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import { SourceTestkit } from '@salesforce/source-testkit';
import { JsonMap } from '@salesforce/ts-types';
import { TEST_REPOS_MAP } from '../testMatrix';

// DO NOT TOUCH. generateNuts.ts will insert these values
const REPO = TEST_REPOS_MAP.get('%REPO_URL%');
const EXECUTABLE = '%EXECUTABLE%';

context('Retrieve manifest NUTs [name: %REPO_NAME%] [exec: %EXECUTABLE%]', () => {
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
    } catch (e) {
      // if the it fails to clean, don't throw so NUTs will pass
      // eslint-disable-next-line no-console
      console.log('Clean Failed: ', e);
    }
  });

  describe('--manifest flag', () => {
    for (const testCase of REPO.retrieve.manifest) {
      const toRetrieve = path.normalize(testCase.toRetrieve);
      it(`should retrieve ${toRetrieve}`, async () => {
        // generate package.xml to use with the --manifest param
        await testkit.convert({ args: `--sourcepath ${testCase.toRetrieve} --outputdir out` });
        const packageXml = path.join('out', 'package.xml');

        await testkit.modifyLocalGlobs(testCase.toVerify);
        await testkit.retrieve({ args: `--manifest ${packageXml}` });
        await testkit.expect.filesToBeDeployed(testCase.toVerify, testCase.toIgnore);
      });
    }

    it('should throw an error if the package.xml is not valid', async () => {
      const retrieve = (await testkit.retrieve({
        args: '--manifest DOES_NOT_EXIST.xml',
        exitCode: 1,
      })) as JsonMap;
      const expectedError = testkit.isLocalExecutable() ? 'Error' : 'InvalidManifestError';
      testkit.expect.errorToHaveName(retrieve, expectedError);
    });
  });
});
