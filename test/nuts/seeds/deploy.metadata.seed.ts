/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { SourceTestkit } from '@salesforce/source-testkit';
import { TEST_REPOS_MAP } from '../testMatrix';

// DO NOT TOUCH. generateNuts.ts will insert these values
const REPO = TEST_REPOS_MAP.get('%REPO_URL%');
const EXECUTABLE = '%EXECUTABLE%';

context('Deploy metadata NUTs [name: %REPO_NAME%] [exec: %EXECUTABLE%]', () => {
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
    } catch {
      // if the it fails to clean, don't throw so NUTs will pass
    }
  });

  describe('--metadata flag', () => {
    for (const testCase of REPO.deploy.metadata) {
      it(`should deploy ${testCase.toDeploy}`, async () => {
        await testkit.deploy({ args: `--metadata ${testCase.toDeploy}` });
        await testkit.expect.filesToBeDeployed(testCase.toVerify, testCase.toIgnore);
      });
    }

    it('should throw an error if the metadata is not valid', async () => {
      const deploy = await testkit.deploy({ args: '--metadata DOES_NOT_EXIST', exitCode: 1 });
      const expectedError = testkit.isLocalExecutable() ? 'RegistryError' : 'UnsupportedType';
      testkit.expect.errorToHaveName(deploy, expectedError);
    });

    it('should not deploy metadata outside of a package directory', async () => {
      await testkit.createApexClass({ args: '--outputdir NotAPackage --classname ShouldNotBeDeployed' });
      await testkit.deploy({ args: '--metadata ApexClass' });
      // this is a glob, so no need for path.join
      await testkit.expect.filesToNotBeDeployed(['NotAPackage/**/*']);
    });
  });
});
