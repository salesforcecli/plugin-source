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

context('Convert NUTs [name: %REPO_NAME%] [exec: %EXECUTABLE%]', () => {
  let nutshell: Nutshell;

  before(async () => {
    nutshell = await Nutshell.create({
      repository: REPO.gitUrl,
      executable: EXECUTABLE,
      context: __filename,
      orgless: true,
    });
  });

  after(async () => {
    await nutshell?.clean();
  });

  describe('--manifest flag', () => {
    for (const testCase of REPO.convert.manifest) {
      it(`should convert ${testCase.toConvert}`, async () => {
        await nutshell.convert({ args: `--sourcepath ${testCase.toConvert} --outputdir out1` });
        const packageXml = path.join('out1', 'package.xml');

        await nutshell.convert({ args: `--manifest ${packageXml} --outputdir out2` });
        await nutshell.expect.directoryToHaveSomeFiles('out2');
        await nutshell.expect.fileToExist(path.join('out2', 'package.xml'));
        await nutshell.expect.filesToBeConverted('out2', testCase.toVerify);
      });
    }

    it('should throw an error if the package.xml is not valid', async () => {
      const convert = await nutshell.convert({ args: '--manifest DOES_NOT_EXIST.xml', exitCode: 1 });
      nutshell.expect.errorToHaveName(convert, 'Error');
    });
  });

  describe('--metadata flag', () => {
    for (const testCase of REPO.convert.metadata) {
      it(`should convert ${testCase.toConvert}`, async () => {
        await nutshell.convert({ args: `--metadata ${testCase.toConvert} --outputdir out` });
        await nutshell.expect.directoryToHaveSomeFiles('out');
        await nutshell.expect.fileToExist(path.join('out', 'package.xml'));
        await nutshell.expect.filesToBeConverted('out', testCase.toVerify);
      });
    }

    it('should throw an error if the metadata is not valid', async () => {
      const convert = await nutshell.convert({ args: '--metadata DOES_NOT_EXIST', exitCode: 1 });
      nutshell.expect.errorToHaveName(convert, 'UnsupportedType');
    });
  });

  describe('--sourcepath flag', () => {
    for (const testCase of REPO.convert.sourcepath) {
      it(`should convert ${testCase.toConvert}`, async () => {
        await nutshell.convert({ args: `--sourcepath ${testCase.toConvert} --outputdir out` });
        await nutshell.expect.directoryToHaveSomeFiles('out');
        await nutshell.expect.fileToExist(path.join('out', 'package.xml'));
        await nutshell.expect.filesToBeConverted('out', testCase.toVerify);
      });
    }

    it('should throw an error if the sourcepath is not valid', async () => {
      const convert = await nutshell.convert({ args: '--sourcepath DOES_NOT_EXIST', exitCode: 1 });
      nutshell.expect.errorToHaveName(convert, 'SourcePathInvalid');
    });
  });
});
