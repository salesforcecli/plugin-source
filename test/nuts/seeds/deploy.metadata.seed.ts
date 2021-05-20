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
      nut: __filename,
    });
    // some deploys reference other metadata not included in the deploy, if it's not already in the org it will fail
    await nutshell.deploy({ args: `--sourcepath ${nutshell.packageNames.join(',')}` });
    await nutshell.assignPermissionSet({ args: '--permsetname dreamhouse' });
  });

  after(async () => {
    await nutshell?.clean();
  });

  it('should deploy the entire project', async () => {
    await nutshell.deploy({ args: `--sourcepath ${nutshell.packageNames.join(',')}` });
    await nutshell.expect.filesToBeDeployed(nutshell.packageGlobs, ['force-app/test/**/*']);
  });

  describe('--metadata flag', () => {
    for (const testCase of REPO.deploy.metadata) {
      it(`should deploy ${testCase.toDeploy}`, async () => {
        await nutshell.deploy({ args: `--metadata ${testCase.toDeploy}` });
        await nutshell.expect.filesToBeDeployed(testCase.toVerify, testCase.toIgnore);
      });
    }

    it('should throw an error if the metadata is not valid', async () => {
      const deploy = await nutshell.deploy({ args: '--metadata DOES_NOT_EXIST', exitCode: 1 });
      const expectedError = nutshell.isSourcePlugin() ? 'RegistryError' : 'UnsupportedType';
      nutshell.expect.errorToHaveName(deploy, expectedError);
    });

    it('should not deploy metadata outside of a package directory', async () => {
      await nutshell.createApexClass({ args: '--outputdir NotAPackage --classname ShouldNotBeDeployed' });
      await nutshell.deploy({ args: '--metadata ApexClass' });
      // this is a glob, so no need for path.join
      await nutshell.expect.filesToNotBeDeployed(['NotAPackage/**/*']);
    });
  });
});
