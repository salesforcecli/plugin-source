/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'node:path';
import { SourceTestkit } from '@salesforce/source-testkit';
import { JsonMap } from '@salesforce/ts-types';
import { TEST_REPOS_MAP } from '../testMatrix';

// DO NOT TOUCH. generateNuts.ts will insert these values
const REPO = TEST_REPOS_MAP.get('%REPO_URL%');

context('Retrieve manifest NUTs [name: %REPO_NAME%]', () => {
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
  describe('--manifest flag', () => {
    let i = 0;
    for (const testCase of REPO.retrieve.manifest) {
      const toRetrieve = path.normalize(testCase.toRetrieve);
      const convertDir = `convert_${i++}`;
      it(`should retrieve ${toRetrieve}`, async () => {
        // generate package.xml to use with the --manifest param
        await testkit.convert({ args: `--sourcepath ${testCase.toRetrieve} --outputdir ${convertDir}`, cli: 'sf' });
        const packageXml = path.join(convertDir, 'package.xml');

        await testkit.modifyLocalGlobs(testCase.toVerify);
        await testkit.retrieve({ args: `--manifest ${packageXml}` });
        await testkit.expect.filesToBeChanged(testCase.toVerify, testCase.toIgnore);
      });
    }

    it('should throw an error if the package.xml is not valid', async () => {
      const retrieve = (await testkit.retrieve({
        args: '--manifest DOES_NOT_EXIST.xml',
        exitCode: 1,
      })) as JsonMap;
      testkit.expect.errorToHaveName(retrieve, 'SfError');
    });
  });
});
