/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import { Nutshell } from '../nutshell';
import { TEST_REPOS_MAP } from '../testMatrix';

// DO NOT TOUCH. generateNuts.ts will insert these values
const REPO = TEST_REPOS_MAP.get('%REPO_URL%');
const EXECUTABLE = '%EXECUTABLE%';

context('Retrieve NUTs [name: %REPO_NAME%] [exec: %EXECUTABLE%]', () => {
  let nutshell: Nutshell;

  before(async () => {
    nutshell = await Nutshell.create({
      repository: REPO.gitUrl,
      executable: EXECUTABLE,
      nut: __filename,
    });
    await nutshell.trackGlobs(nutshell.packageGlobs);
    await nutshell.deploy({ args: `--sourcepath ${nutshell.packageNames.join(',')}` });
  });

  after(async () => {
    await nutshell?.clean();
  });

  describe('--manifest flag', () => {
    for (const testCase of REPO.retrieve.manifest) {
      const toRetrieve = path.normalize(testCase.toRetrieve);
      it(`should retrieve ${toRetrieve}`, async () => {
        // generate package.xml to use with the --manifest param
        await nutshell.convert({ args: `--sourcepath ${toRetrieve} --outputdir out` });
        const outputDir = path.join(process.cwd(), 'out');
        nutshell.findAndMoveManifest(outputDir);
        const packageXml = path.join(process.cwd(), 'package.xml');

        await nutshell.modifyLocalGlobs(testCase.toVerify);
        await nutshell.retrieve({ args: `--manifest ${packageXml}` });
        await nutshell.expect.filesToBeChanged(testCase.toVerify, testCase.toIgnore);
      });
    }

    it('should throw an error if the package.xml is not valid', async () => {
      const retrieve = await nutshell.retrieve({ args: '--manifest DOES_NOT_EXIST.xml', exitCode: 1 });
      const expectedError = nutshell.isSourcePlugin() ? 'Error' : 'InvalidManifestError';
      nutshell.expect.errorToHaveName(retrieve, expectedError);
    });
  });
});
