/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import * as shelljs from 'shelljs';
import { asString } from '@salesforce/ts-types';
import { SourceTestkit } from '@salesforce/source-testkit';
import { TEST_REPOS_MAP } from '../testMatrix';

// DO NOT TOUCH. generateNuts.ts will insert these values
const REPO = TEST_REPOS_MAP.get('%REPO_URL%');
const EXECUTABLE = '%EXECUTABLE%';

context('Convert NUTs [name: %REPO_NAME%] [exec: %EXECUTABLE%]', () => {
  let testkit: SourceTestkit;

  before(async () => {
    testkit = await SourceTestkit.create({
      repository: REPO.gitUrl,
      executable: EXECUTABLE,
      nut: __filename,
      orgless: true,
    });
  });

  after(async () => {
    try {
      await testkit?.clean();
    } catch {
      // if the it fails to clean, don't throw so NUTs will pass
    }
  });

  describe('--manifest flag', () => {
    let convertDir: string;

    for (const testCase of REPO.convert.manifest) {
      it(`should convert ${testCase.toConvert}`, async () => {
        // Generate a package.xml by converting via sourcepath
        const toConvert = path.normalize(testCase.toConvert);
        await testkit.convert({
          args: `--sourcepath ${toConvert} --outputdir out1`,
          exitCode: 0,
        });
        const outputDir = path.join(process.cwd(), 'out1');
        testkit.findAndMoveManifest(outputDir);
        const packageXml = path.join(process.cwd(), 'package.xml');

        const res = await testkit.convert({ args: `--manifest ${packageXml} --outputdir out2`, exitCode: 0 });

        convertDir = path.relative(process.cwd(), asString(res.result?.location));
        await testkit.expect.directoryToHaveSomeFiles(convertDir);
        await testkit.expect.fileToExist(path.join(convertDir, 'package.xml'));
        await testkit.expect.filesToBeConverted(convertDir, testCase.toVerify);
      });

      afterEach(() => {
        if (convertDir) {
          shelljs.rm('-rf', convertDir);
        }
      });
    }

    it('should throw an error if the package.xml is not valid', async () => {
      const convert = await testkit.convert({ args: '--manifest DOES_NOT_EXIST.xml', exitCode: 1 });
      testkit.expect.errorToHaveName(convert, 'Error');
    });
  });

  describe('--metadata flag', () => {
    let convertDir: string;

    for (const testCase of REPO.convert.metadata) {
      it(`should convert ${testCase.toConvert}`, async () => {
        const res = await testkit.convert({ args: `--metadata ${testCase.toConvert} --outputdir out`, exitCode: 0 });

        convertDir = path.relative(process.cwd(), asString(res.result?.location));
        await testkit.expect.directoryToHaveSomeFiles(convertDir);
        await testkit.expect.fileToExist(path.join(convertDir, 'package.xml'));
        await testkit.expect.filesToBeConverted(convertDir, testCase.toVerify);
      });
    }

    afterEach(() => {
      if (convertDir) {
        shelljs.rm('-rf', convertDir);
      }
    });

    it('should throw an error if the metadata is not valid', async () => {
      const convert = await testkit.convert({ args: '--metadata DOES_NOT_EXIST', exitCode: 1 });
      const expectedError = testkit.isLocalExecutable() ? 'RegistryError' : 'UnsupportedType';
      testkit.expect.errorToHaveName(convert, expectedError);
    });
  });

  describe('--sourcepath flag', () => {
    let convertDir: string;

    for (const testCase of REPO.convert.sourcepath) {
      it(`should convert ${testCase.toConvert}`, async () => {
        const toConvert = path.normalize(testCase.toConvert);
        const res = await testkit.convert({ args: `--sourcepath ${toConvert} --outputdir out`, exitCode: 0 });

        convertDir = path.relative(process.cwd(), asString(res.result?.location));
        await testkit.expect.directoryToHaveSomeFiles(convertDir);
        await testkit.expect.fileToExist(path.join(convertDir, 'package.xml'));
        await testkit.expect.filesToBeConverted(convertDir, testCase.toVerify);
      });
    }

    afterEach(() => {
      if (convertDir) {
        shelljs.rm('-rf', convertDir);
      }
    });

    it('should throw an error if the sourcepath is not valid', async () => {
      const convert = await testkit.convert({ args: '--sourcepath DOES_NOT_EXIST', exitCode: 1 });
      const expectedError = testkit.isLocalExecutable() ? 'SfdxError' : 'SourcePathInvalid';
      testkit.expect.errorToHaveName(convert, expectedError);
    });
  });
});
