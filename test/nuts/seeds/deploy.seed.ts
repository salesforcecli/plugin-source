/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Nutcase } from '../nutcase';
import { RepoConfig } from '../testMatrix';

// DO NOT TOUCH. generateNuts.ts will insert these values
const REPO = { gitUrl: '' } as RepoConfig;
const EXECUTABLE = '';

context('Deploy NUTs %REPO% %EXEC%', () => {
  let nutcase: Nutcase;

  before(async () => {
    nutcase = await Nutcase.create({ repository: REPO.gitUrl, executable: EXECUTABLE });
  });

  after(async () => {
    await nutcase?.clean();
  });

  it('should deploy the entire project', async () => {
    const deploy = await nutcase.deploy({ args: `--sourcepath ${nutcase.packageNames.join(',')}` });
    await nutcase.expect.allMetaXmlsToBeDeployed(deploy.result, ...nutcase.packagePaths);
    nutcase.expect.deployJsonToBeValid(deploy.result);
  });

  describe('--sourcepath flag', () => {
    for (const testCase of REPO.deploy.sourcepath) {
      it(`should deploy ${testCase.toDeploy}`, async () => {
        const deploy = await nutcase.deploy({ args: `--sourcepath ${testCase.toDeploy}` });
        await nutcase.expect.filesToBeDeployed(deploy.result, testCase.toVerify);
        nutcase.expect.deployJsonToBeValid(deploy.result);
      });
    }
  });

  describe('--metadata flag', () => {
    for (const testCase of REPO.deploy.metadata) {
      it(`should deploy ${testCase.toDeploy}`, async () => {
        const deploy = await nutcase.deploy({ args: `--metadata ${testCase.toDeploy}` });
        await nutcase.expect.filesToBeDeployed(deploy.result, testCase.toVerify);
        nutcase.expect.deployJsonToBeValid(deploy.result);
      });
    }
  });
});
