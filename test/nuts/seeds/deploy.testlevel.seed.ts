/*
 * Copyright 2025, Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { fileURLToPath } from 'node:url';
import { SourceTestkit } from '@salesforce/source-testkit';
import { RepoConfig, TEST_REPOS_MAP } from '../testMatrix.js';

// DO NOT TOUCH. generateNuts.ts will insert these values
const REPO = TEST_REPOS_MAP.get('%REPO_URL%') as RepoConfig;

context('Deploy testlevel NUTs [name: %REPO_NAME%]', () => {
  let testkit: SourceTestkit;

  before(async () => {
    testkit = await SourceTestkit.create({
      repository: REPO.gitUrl,
      nut: fileURLToPath(import.meta.url),
    });
    await testkit.deploy({ args: `--sourcepath ${testkit.packageNames.join(',')}` });

    if (REPO.gitUrl.includes('dreamhouse')) {
      // running tests requires a special permission in the 'dreamhouse' permission set
      await testkit.assignPermissionSet({ args: '--permsetname dreamhouse', cli: 'sf' });
    }
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
