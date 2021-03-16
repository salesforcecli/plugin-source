/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ComplexDeployResult } from '../types';
import { Nutshell } from '../nutshell';
import { TEST_REPOS_MAP } from '../testMatrix';

// DO NOT TOUCH. generateNuts.ts will insert these values
const REPO = TEST_REPOS_MAP.get('%REPO_URL%');
const EXECUTABLE = '%EXECUTABLE%';

context('Deploy testlevel NUTs [name: %REPO_NAME%] [exec: %EXECUTABLE%]', () => {
  let nutshell: Nutshell;

  before(async () => {
    nutshell = await Nutshell.create({
      repository: REPO.gitUrl,
      executable: EXECUTABLE,
      nut: __filename,
    });
  });

  after(async () => {
    await nutshell?.clean();
  });

  describe('--testlevel', () => {
    it('should run no tests (NoTestRun)', async () => {
      await nutshell.deploy<ComplexDeployResult>({
        args: `--sourcepath ${nutshell.packageNames.join(',')} --testlevel NoTestRun --checkonly`,
      });
      await nutshell.expect.noApexTestsToBeRun();
    });

    it('should run tests locally (RunLocalTests)', async () => {
      await nutshell.deploy<ComplexDeployResult>({
        args: `--sourcepath ${nutshell.packageNames.join(',')} --testlevel RunLocalTests --checkonly`,
      });
      await nutshell.expect.apexTestsToBeRun();
    });

    it('should run tests in org (RunAllTestsInOrg)', async () => {
      await nutshell.deploy<ComplexDeployResult>({
        args: `--sourcepath ${nutshell.packageNames.join(',')} --testlevel RunAllTestsInOrg --checkonly`,
      });
      await nutshell.expect.apexTestsToBeRun();
    });

    it('should run specified tests (RunSpecifiedTests)', async () => {
      const packageNames = nutshell.packageNames.join(',');
      const tests = REPO.deploy.testlevel.specifiedTests.join(',');
      // NOTE: we cannot do a --checkonly deployment here because we need the ApexClasses to exist in the
      // org in order to programmatically map the specified test to the test results
      await nutshell.deploy<ComplexDeployResult>({
        args: `--sourcepath ${packageNames} --testlevel RunSpecifiedTests --runtests ${tests} --ignoreerrors`,
      });
      await nutshell.expect.specificApexTestsToBeRun(REPO.deploy.testlevel.specifiedTests);
    });
  });
});
