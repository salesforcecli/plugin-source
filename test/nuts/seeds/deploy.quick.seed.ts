/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { SourceTestkit } from '@salesforce/source-testkit';
import { Result } from '@salesforce/source-testkit/lib/types';
import { get } from '@salesforce/ts-types';
import { FileResponse } from '@salesforce/source-deploy-retrieve';
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

  it('should deploy validated (checkonly) deploy', async () => {
    // delete the lwc test stubs which will cause errors with the source tracking/globbing
    await testkit.deleteGlobs(['force-app/test/**/*']);
    const checkOnly = (await testkit.deploy({
      args: `--sourcepath ${testkit.packageNames.join(',')} --testlevel RunLocalTests --checkonly --ignoreerrors`,
    })) as Result<{ id: string; result: { id: string } }>;
    testkit.expect.toHaveProperty(checkOnly.result, 'id');
    await testkit.expect.filesToNotBeDeployed(testkit.packageGlobs);

    const quickDeploy = (await testkit.deploy({
      args: `--validateddeployrequestid ${checkOnly.result.id}`,
    })) as Result<{ id: string; result: { id: string } }>;
    testkit.expect.toHavePropertyAndValue(quickDeploy.result, 'status', 'Succeeded');

    const fileResponse = get(quickDeploy, 'result.deployedSource') as FileResponse[];
    await testkit.expect.filesToBeDeployedViaResult(testkit.packageGlobs, [], fileResponse);
  });
});
