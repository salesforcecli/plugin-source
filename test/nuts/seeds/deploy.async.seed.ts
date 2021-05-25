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

context.skip('Async Deploy NUTs [name: %REPO_NAME%] [exec: %EXECUTABLE%]', () => {
  let testkit: SourceTestkit;

  before(async () => {
    testkit = await SourceTestkit.create({
      repository: REPO.gitUrl,
      executable: EXECUTABLE,
      nut: __filename,
    });
  });

  after(async () => {
    try {
      await testkit?.clean();
    } catch {
      // if the it fails to clean, don't throw so NUTs will pass
    }
  });

  it('should deploy the entire project', async () => {
    await testkit.deploy({ args: `--sourcepath ${testkit.packageNames.join(',')}` });
    await testkit.expect.filesToBeDeployed(testkit.packageGlobs);
  });

  describe('async deploy', () => {
    it('should return an id immediately when --wait is set to 0 and deploy:report should report results', async () => {
      const deploy = await testkit.deploy({
        args: `--sourcepath ${testkit.packageNames.join(',')} --wait 0`,
      });

      testkit.expect.toHaveProperty(deploy.result, 'id');
      testkit.expect.toHavePropertyAndNotValue(deploy.result, 'status', 'Succeeded');

      const report = await testkit.deployReport({ args: `-i ${deploy.result.id}` });
      testkit.expect.toHavePropertyAndValue(report.result, 'status', 'Succeeded');
      await testkit.expect.filesToBeDeployed(testkit.packageGlobs, [], 'force:source:deploy:report');
    });

    it('should return an id immediately when --wait is set to 0 and deploy:cancel should cancel the deploy', async () => {
      const deploy = await testkit.deploy({
        args: `--sourcepath ${testkit.packageNames.join(',')} --wait 0`,
      });
      testkit.expect.toHaveProperty(deploy.result, 'id');
      testkit.expect.toHavePropertyAndNotValue(deploy.result, 'status', 'Succeeded');

      await testkit.deployCancel({ args: `-i ${deploy.result.id}` });
      await testkit.expect.someFilesToNotBeDeployed(testkit.packageGlobs, 'force:source:deploy:cancel');
    });
  });
});
