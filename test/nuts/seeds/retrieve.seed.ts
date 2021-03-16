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
      it(`should retrieve ${testCase.toRetrieve}`, async () => {
        await nutshell.convert({ args: `--sourcepath ${testCase.toRetrieve} --outputdir out` });
        const packageXml = path.join('out', 'package.xml');

        await nutshell.modifyLocalGlobs(testCase.toVerify);
        await nutshell.retrieve({ args: `--manifest ${packageXml}` });
        await nutshell.expect.filesToBeChanged(testCase.toVerify);
      });
    }

    it('should throw an error if the package.xml is not valid', async () => {
      const retrieve = await nutshell.retrieve({ args: '--manifest DOES_NOT_EXIST.xml', exitCode: 1 });
      nutshell.expect.errorToHaveName(retrieve, 'InvalidManifestError');
    });
  });

  describe('--metadata flag', () => {
    for (const testCase of REPO.retrieve.metadata) {
      it(`should retrieve ${testCase.toRetrieve}`, async () => {
        await nutshell.modifyLocalGlobs(testCase.toVerify);
        await nutshell.retrieve({ args: `--metadata ${testCase.toRetrieve}` });
        await nutshell.expect.filesToBeChanged(testCase.toVerify);
      });
    }

    it('should throw an error if the metadata is not valid', async () => {
      const retrieve = await nutshell.retrieve({ args: '--metadata DOES_NOT_EXIST', exitCode: 1 });
      nutshell.expect.errorToHaveName(retrieve, 'UnsupportedType');
    });
  });

  describe('--sourcepath flag', () => {
    for (const testCase of REPO.retrieve.sourcepath) {
      it(`should retrieve ${testCase.toRetrieve}`, async () => {
        await nutshell.modifyLocalGlobs(testCase.toVerify);
        await nutshell.retrieve({ args: `--sourcepath ${testCase.toRetrieve}` });
        await nutshell.expect.filesToBeChanged(testCase.toVerify);
      });
    }

    it('should throw an error if the sourcepath is not valid', async () => {
      const retrieve = await nutshell.retrieve({ args: '--sourcepath DOES_NOT_EXIST', exitCode: 1 });
      nutshell.expect.errorToHaveName(retrieve, 'UnexpectedFileFound');
    });
  });
});
