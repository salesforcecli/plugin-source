/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import { exec } from 'shelljs';
import { Nutshell } from '../nutshell';
import { TEST_REPOS_MAP } from '../testMatrix';

// DO NOT TOUCH. generateNuts.ts will insert these values
const REPO = TEST_REPOS_MAP.get('%REPO_URL%');
const EXECUTABLE = '%EXECUTABLE%';

context('Retrieve Sourcepath NUTs [name: %REPO_NAME%] [exec: %EXECUTABLE%]', () => {
  let nutshell: Nutshell;

  before(async () => {
    nutshell = await Nutshell.create({
      repository: REPO.gitUrl,
      executable: EXECUTABLE,
      nut: __filename,
    });
    await nutshell.trackGlobs(nutshell.packageGlobs);
    exec(`sfdx force:source:deploy --sourcepath ${nutshell.packageNames.join(',')}`);
    // await nutshell.deploy({ args: `--sourcepath ${nutshell.packageNames.join(',')}` });
  });

  after(async () => {
    // await nutshell?.clean();
  });

  describe('--sourcepath flag', () => {
    for (const testCase of REPO.retrieve.sourcepath) {
      const toRetrieve = path.normalize(testCase.toRetrieve);
      it(`should retrieve ${toRetrieve}`, async () => {
        await nutshell.modifyLocalGlobs(testCase.toVerify);
        await nutshell.retrieve({ args: `--sourcepath ${toRetrieve}` });
        await nutshell.expect.filesToBeChanged(testCase.toVerify, testCase.toIgnore);
      });
    }

    it('should throw an error if the sourcepath is not valid', async () => {
      const retrieve = await nutshell.retrieve({ args: '--sourcepath DOES_NOT_EXIST', exitCode: 1 });
      const expectedError = nutshell.isSourcePlugin() ? 'SfdxError' : 'UnexpectedFileFound';
      nutshell.expect.errorToHaveName(retrieve, expectedError);
    });
  });
});
