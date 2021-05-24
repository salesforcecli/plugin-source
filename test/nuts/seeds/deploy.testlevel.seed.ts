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

context('Deploy testlevel NUTs [name: %REPO_NAME%] [exec: %EXECUTABLE%]', () => {
  let testkit: SourceTestkit;

  before(async () => {
    testkit = await SourceTestkit.create({
      repository: REPO.gitUrl,
      executable: EXECUTABLE,
      nut: __filename,
    });
    await testkit.deploy({ args: `--sourcepath ${testkit.packageNames.join(',')}` });

    if (REPO.gitUrl.includes('dreamhouse')) {
      // running tests requires a special permission in the 'dreamhouse' permission set
      await testkit.assignPermissionSet({ args: '--permsetname dreamhouse' });
    }
  });

  after(async () => {
    await testkit?.clean();
  });

  describe('--testlevel', () => {
    it('should run no tests (NoTestRun)', async () => {
      await testkit.deploy({
        args: `--sourcepath ${testkit.packageNames.join(',')} --testlevel NoTestRun`,
      });
      await testkit.expect.noApexTestsToBeRun();
    });

    it('should run tests locally (RunLocalTests)', async () => {
      await testkit.deploy({
        args: `--sourcepath ${testkit.packageNames.join(',')} --testlevel RunLocalTests`,
      });
      await testkit.expect.apexTestsToBeRun();
    });

    it('should run tests in org (RunAllTestsInOrg)', async () => {
      await testkit.deploy({
        args: `--sourcepath ${testkit.packageNames.join(',')} --testlevel RunAllTestsInOrg`,
      });
      await testkit.expect.apexTestsToBeRun();
    });

    it('should run specified tests (RunSpecifiedTests)', async () => {
      const packageNames = testkit.packageNames.join(',');
      const tests = REPO.deploy.testlevel.specifiedTests.join(',');
      // NOTE: we cannot do a --checkonly deployment here because we need the ApexClasses to exist in the
      // org in order to programmatically map the specified test to the test results
      await testkit.deploy({
        args: `--sourcepath ${packageNames} --testlevel RunSpecifiedTests --runtests ${tests} --ignoreerrors`,
      });
      await testkit.expect.specificApexTestsToBeRun(REPO.deploy.testlevel.specifiedTests);
    });
  });
});
