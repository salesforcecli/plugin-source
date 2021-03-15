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

context('Deploy metadata NUTs [name: %REPO_NAME%] [exec: %EXECUTABLE%]', () => {
  let nutshell: Nutshell;

  before(async () => {
    nutshell = await Nutshell.create({
      repository: REPO.gitUrl,
      executable: EXECUTABLE,
      context: __filename,
    });
  });

  after(async () => {
    await nutshell?.clean();
  });

  it('should deploy the entire project', async () => {
    await nutshell.deploy({ args: `--sourcepath ${nutshell.packageNames.join(',')}` });
    await nutshell.expect.filesToBeDeployed(nutshell.packageGlobs);
  });

  describe('--metadata flag', () => {
    for (const testCase of REPO.deploy.metadata) {
      it(`should deploy ${testCase.toDeploy}`, async () => {
        await nutshell.deploy({ args: `--metadata ${testCase.toDeploy}` });
        await nutshell.expect.filesToBeDeployed(testCase.toVerify);
      });
    }

    it('should throw an error if the metadata is not valid', async () => {
      const deploy = await nutshell.deploy({ args: '--metadata DOES_NOT_EXIST', exitCode: 1 });
      nutshell.expect.errorToHaveName(deploy, 'UnsupportedType');
    });

    it('should not deploy metadata outside of a package directory', async () => {
      const apex = await nutshell.createApexClass({ args: '--outputdir NotAPackage --classname ShouldNotBeDeployed' });
      await nutshell.deploy({ args: '--metadata ApexClass' });
      await nutshell.expect.filesToNotBeDeployed(apex.result.created);
    });
  });
});
