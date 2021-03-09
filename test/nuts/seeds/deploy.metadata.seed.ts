/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Nutshell } from '../nutshell';
import { RepoConfig } from '../testMatrix';

// DO NOT TOUCH. generateNuts.ts will insert these values
const REPO = { gitUrl: '' } as RepoConfig;
const EXECUTABLE = '';

context('Deploy metadata NUTs %REPO% %EXEC%', () => {
  let nutshell: Nutshell;

  before(async function () {
    nutshell = await Nutshell.create({
      repository: REPO.gitUrl,
      executable: EXECUTABLE,
      context: this.test?.parent.title,
    });
  });

  after(async () => {
    await nutshell?.clean();
  });

  describe('--metadata flag', () => {
    for (const testCase of REPO.deploy.metadata) {
      it(`should deploy ${testCase.toDeploy}`, async () => {
        const deploy = await nutshell.deploy({ args: `--metadata ${testCase.toDeploy}` });
        nutshell.expect.deployJsonToBeValid(deploy.result);
        await nutshell.expect.filesToBeDeployed(deploy.result, testCase.toVerify);
      });
    }

    it('should throw an error if the metadata is not valid', async () => {
      const deploy = await nutshell.deploy({ args: '--metadata DOES_NOT_EXIST', exitCode: 1 });
      nutshell.expect.errorToHaveName(deploy, 'UnsupportedType');
    });
  });
});
