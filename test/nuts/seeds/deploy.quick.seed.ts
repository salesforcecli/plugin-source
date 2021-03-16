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

context('Quick Deploy NUTs [name: %REPO_NAME%] [exec: %EXECUTABLE%]', () => {
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

  describe('--checkonly flag', () => {
    it('should check deploy of all packages', async () => {
      await nutshell.deploy({
        args: `--sourcepath ${nutshell.packageNames.join(',')} --checkonly`,
      });
      await nutshell.expect.filesToNotBeDeployed(nutshell.packageGlobs);
    });
  });

  describe('quick deploy', () => {
    it('should return an id immediately when --wait is set to 0 and deploy:report should report results', async () => {
      const checkOnly = await nutshell.deploy({
        args: `--sourcepath ${nutshell.packageNames.join(',')} --testlevel RunLocalTests --checkonly`,
      });
      nutshell.expect.toHaveProperty(checkOnly.result, 'id');

      const quickDeploy = await nutshell.deploy({
        args: `--validateddeployrequestid ${checkOnly.result.id}`,
      });
      nutshell.expect.toHavePropertyAndValue(quickDeploy.result, 'status', 'Succeeded');
      await nutshell.expect.filesToBeDeployed(nutshell.packageGlobs);
    });
  });
});
