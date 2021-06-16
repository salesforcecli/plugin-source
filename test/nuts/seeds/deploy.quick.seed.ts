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

context('Quick Deploy NUTs [name: %REPO_NAME%] [exec: %EXECUTABLE%]', () => {
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
    } catch (e) {
      // if the it fails to clean, don't throw so NUTs will pass
      // eslint-disable-next-line no-console
      console.log('Clean Failed: ', e);
    }
  });

  describe('--checkonly flag', () => {
    it('should check deploy of all packages', async () => {
      // delete the lwc test stubs which will cause errors with the source tracking/globbing
      await testkit.deleteGlobs(['force-app/test/**/*']);
      await testkit.deploy({
        args: `--sourcepath ${testkit.packageNames.join(',')} --checkonly --ignoreerrors`,
      });
      await testkit.expect.filesToNotBeDeployed(testkit.packageGlobs);
    });
  });

  describe('quick deploy', () => {
    it('should return an id immediately when --wait is set to 0 and deploy:report should report results', async () => {
      // delete the lwc test stubs which will cause errors with the source tracking/globbing
      await testkit.deleteGlobs(['force-app/test/**/*']);
      const checkOnly = await testkit.deploy({
        args: `--sourcepath ${testkit.packageNames.join(',')} --testlevel RunLocalTests --checkonly --ignoreerrors`,
      });
      testkit.expect.toHaveProperty(checkOnly.result, 'id');

      const quickDeploy = await testkit.deploy({
        args: `--validateddeployrequestid ${checkOnly.result.id}`,
      });
      testkit.expect.toHavePropertyAndValue(quickDeploy.result, 'status', 'Succeeded');
      await testkit.expect.filesToBeChanged(testkit.packageGlobs);
    });
  });
});
