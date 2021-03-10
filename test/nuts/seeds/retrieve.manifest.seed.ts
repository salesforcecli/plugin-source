/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import { Nutshell } from '../nutshell';
import { RepoConfig } from '../testMatrix';

// DO NOT TOUCH. generateNuts.ts will insert these values
const REPO = { gitUrl: '' } as RepoConfig;
const EXECUTABLE = '';

context('Retrieve manifest NUTs %REPO% %EXEC%', () => {
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
    const deploy = await nutshell.deploy({ args: `--sourcepath ${nutshell.packageNames.join(',')}` });
    nutshell.expect.deployJsonToBeValid(deploy.result);
    await nutshell.expect.allMetaXmlsToBeDeployed(deploy.result, ...nutshell.packagePaths);
  });

  describe('--manifest flag', () => {
    for (const testCase of REPO.retrieve.manifest) {
      it(`should retrieve ${testCase.toRetrieve}`, async () => {
        const convert = await nutshell.convert({ args: `--sourcepath ${testCase.toRetrieve} --outputdir out` });
        nutshell.expect.convertJsonToBeValid(convert.result);
        const packageXml = path.join(convert.result.location, 'package.xml');

        const retrieve = await nutshell.retrieve({ args: `--manifest ${packageXml}` });
        nutshell.expect.retrieveJsonToBeValid(retrieve.result);
        await nutshell.expect.filesToBeRetrieved(retrieve.result, testCase.toVerify);
      });
    }

    it('should throw an error if the package.xml is not valid', async () => {
      const deploy = await nutshell.retrieve({ args: '--manifest DOES_NOT_EXIST.xml', exitCode: 1 });
      nutshell.expect.errorToHaveName(deploy, 'InvalidManifestError');
    });
  });
});
