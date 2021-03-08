/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { NutButter } from '../nutButter';
import { RepoConfig } from '../testMatrix';

// DO NOT TOUCH. generateNuts.ts will insert these values
const REPO = { gitUrl: '' } as RepoConfig;
const EXECUTABLE = '';

context('Deploy NUTs %REPO% %EXEC%', () => {
  let nutButter: NutButter;

  before(async () => {
    nutButter = await NutButter.create({ repository: REPO.gitUrl, executable: EXECUTABLE });
  });

  after(async () => {
    await nutButter?.clean();
  });

  it('should deploy the entire project', async () => {
    const deploy = await nutButter.deploy({ args: `--sourcepath ${nutButter.packageNames.join(',')}` });
    await nutButter.expect.allMetaXmlsToBeDeployed(deploy.result, ...nutButter.packagePaths);
    nutButter.expect.deployJsonToBeValid(deploy.result);
  });

  describe('--sourcepath flag', () => {
    for (const testCase of REPO.deploy.sourcepath) {
      it(`should deploy ${testCase.toDeploy}`, async () => {
        const deploy = await nutButter.deploy({ args: `--sourcepath ${testCase.toDeploy}` });
        await nutButter.expect.filesToBeDeployed(deploy.result, testCase.toVerify);
        nutButter.expect.deployJsonToBeValid(deploy.result);
      });
    }
  });

  describe('--metadata flag', () => {
    for (const testCase of REPO.deploy.metadata) {
      it(`should deploy ${testCase.toDeploy}`, async () => {
        const deploy = await nutButter.deploy({ args: `--metadata ${testCase.toDeploy}` });
        await nutButter.expect.filesToBeDeployed(deploy.result, testCase.toVerify);
        nutButter.expect.deployJsonToBeValid(deploy.result);
      });
    }
  });
});
