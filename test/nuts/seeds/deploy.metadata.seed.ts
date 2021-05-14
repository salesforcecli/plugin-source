/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import { Nutshell } from '../nutshell';
import { TEST_REPOS_MAP } from '../testMatrix';
import { Result } from '../types';

// DO NOT TOUCH. generateNuts.ts will insert these values
const REPO = TEST_REPOS_MAP.get('%REPO_URL%');
const EXECUTABLE = '%EXECUTABLE%';

context.skip('Deploy metadata NUTs [name: %REPO_NAME%] [exec: %EXECUTABLE%]', () => {
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

  describe('--metadata flag', () => {
    for (const testCase of REPO.deploy.metadata) {
      const toDeploy = path.normalize(testCase.toDeploy);
      it(`should deploy ${toDeploy}`, async () => {
        await nutshell.deploy({ args: `--metadata ${toDeploy}` });
        await nutshell.expect.filesToBeDeployed(testCase.toVerify, testCase.toIgnore);
      });
    }

    it('should throw an error if the metadata is not valid', async () => {
      const deploy = await nutshell.deploy({ args: '--metadata DOES_NOT_EXIST', exitCode: 1 });
      const expectedError = nutshell.isSourcePlugin() ? 'RegistryError' : 'UnsupportedType';
      nutshell.expect.errorToHaveName(deploy, expectedError);
    });

    it('should not deploy metadata outside of a package directory', async () => {
      let apex: Result<{ created: string[] }>;
      try {
        // process.env.TESTKIT_EXECUTABLE_PATH = shelljs.which('sfdx');
        apex = await nutshell.createApexClass({ args: '--outputdir NotAPackage --classname ShouldNotBeDeployed' });
      } finally {
        // delete process.env.TESTKIT_EXECUTABLE_PATH;
      }

      await nutshell.deploy({ args: '--metadata ApexClass' });
      await nutshell.expect.filesToNotBeDeployed(apex.result.created);
    });
  });
});
