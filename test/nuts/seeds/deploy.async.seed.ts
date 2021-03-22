/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Nutshell } from '../nutshell';
import { TEST_REPOS_MAP } from '../testMatrix';

// DO NOT TOUCH. generateNuts.ts will insert these values
const REPO = TEST_REPOS_MAP.get('%REPO_URL%');
const EXECUTABLE = '%EXECUTABLE%';

context('Async Deploy NUTs [name: %REPO_NAME%] [exec: %EXECUTABLE%]', () => {
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

  it('should deploy the entire project', async () => {
    await nutshell.deploy({ args: `--sourcepath ${nutshell.packageNames.join(',')}` });
    await nutshell.expect.filesToBeDeployed(nutshell.packageGlobs);
  });

  describe('async deploy', () => {
    it('should return an id immediately when --wait is set to 0 and deploy:report should report results', async () => {
      const deploy = await nutshell.deploy({
        args: `--sourcepath ${nutshell.packageNames.join(',')} --wait 0`,
      });

      nutshell.expect.toHaveProperty(deploy.result, 'id');
      nutshell.expect.toHavePropertyAndNotValue(deploy.result, 'status', 'Succeeded');

      const report = await nutshell.deployReport({ args: `-i ${deploy.result.id}` });
      nutshell.expect.toHavePropertyAndValue(report.result, 'status', 'Succeeded');
      await nutshell.expect.filesToBeDeployed(nutshell.packageGlobs, 'force:source:deploy:report');
    });

    it('should return an id immediately when --wait is set to 0 and deploy:cancel should cancel the deploy', async () => {
      const deploy = await nutshell.deploy({
        args: `--sourcepath ${nutshell.packageNames.join(',')} --wait 0`,
      });
      nutshell.expect.toHaveProperty(deploy.result, 'id');
      nutshell.expect.toHavePropertyAndNotValue(deploy.result, 'status', 'Succeeded');

      await nutshell.deployCancel({ args: `-i ${deploy.result.id}` });
      await nutshell.expect.someFilesToNotBeDeployed(nutshell.packageGlobs, 'force:source:deploy:cancel');
    });
  });
});
