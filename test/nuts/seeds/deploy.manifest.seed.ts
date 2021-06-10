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

context('Deploy manifest NUTs [name: %REPO_NAME%] [exec: %EXECUTABLE%]', () => {
  let testkit: SourceTestkit;

  before(async () => {
    testkit = await SourceTestkit.create({
      repository: REPO.gitUrl,
      executable: EXECUTABLE,
      nut: __filename,
    });
    // some deploys reference other metadata not included in the deploy, if it's not already in the org it will fail
    await testkit.deploy({ args: `--sourcepath ${testkit.packageNames.join(',')}` });
    await testkit.assignPermissionSet({ args: '--permsetname dreamhouse' });
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
    for (const testCase of REPO.deploy.manifest) {
      const toDeploy = path.normalize(testCase.toDeploy);
      it(`should deploy ${toDeploy}`, async () => {
        await testkit.convert({ args: `--sourcepath ${testCase.toDeploy} --outputdir out` });
        const packageXml = path.join('out', 'package.xml');

        await testkit.deploy({ args: `--manifest ${packageXml}` });
        await testkit.expect.filesToBeDeployed(testCase.toVerify);
      });
    }

    it('should throw an error if the package.xml is not valid', async () => {
      const deploy = await testkit.deploy({ args: '--manifest DOES_NOT_EXIST.xml', exitCode: 1 });
      const expectedError = testkit.isLocalExecutable() ? 'Error' : 'InvalidManifestError';
      testkit.expect.errorToHaveName(deploy, expectedError);
    });
  });
});
