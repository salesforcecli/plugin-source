/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import * as shelljs from 'shelljs';
import { Nutshell } from '../nutshell';
import { TEST_REPOS_MAP } from '../testMatrix';

// DO NOT TOUCH. generateNuts.ts will insert these values
const REPO = TEST_REPOS_MAP.get('%REPO_URL%');
const EXECUTABLE = '%EXECUTABLE%';

// SDR does not output the package.xml in the same location as toolbelt
// so we have to find it within the output dir, move it, and delete the
// generated dir.
const mvManifest = (dir: string) => {
  const manifest = shelljs.find(dir).filter((file) => file.includes(`${path.sep}package.xml`));
  if (!manifest?.length) {
    throw Error(`Did not find package.xml within ${dir}`);
  }
  shelljs.mv(manifest[0], path.join(process.cwd()));
  shelljs.rm('-rf', dir);
};

const isSourcePlugin = (): boolean => {
  return EXECUTABLE.endsWith(`${path.sep}bin${path.sep}run`);
};

context('Convert NUTs [name: %REPO_NAME%] [exec: %EXECUTABLE%]', () => {
  let nutshell: Nutshell;

  before(async () => {
    nutshell = await Nutshell.create({
      repository: REPO.gitUrl,
      executable: EXECUTABLE,
      nut: __filename,
      orgless: true,
    });
  });

  after(async () => {
    await nutshell?.clean();
  });

  describe('--manifest flag', () => {
    let convertDir: string;

    for (const testCase of REPO.convert.manifest) {
      it(`should convert ${testCase.toConvert}`, async () => {
        // Generate a package.xml by converting via sourcepath
        await nutshell.convert({ args: `--sourcepath ${testCase.toConvert} --outputdir out1` });
        const outputDir = path.join(process.cwd(), 'out1');
        mvManifest(outputDir);
        const packageXml = path.join(process.cwd(), 'package.xml');

        await nutshell.convert({ args: `--manifest ${packageXml} --outputdir out2` });

        convertDir = path.join(process.cwd(), 'out2');
        if (isSourcePlugin()) {
          const sdrConvertDirName = shelljs.ls(convertDir)[0];
          convertDir = path.join(convertDir, sdrConvertDirName);
        }
        await nutshell.expect.directoryToHaveSomeFiles(convertDir);
        await nutshell.expect.fileToExist(path.join(convertDir, 'package.xml'));
        await nutshell.expect.filesToBeConverted(convertDir, testCase.toVerify);
      });

      afterEach(() => {
        shelljs.rm('-rf', convertDir);
      });
    }

    it('should throw an error if the package.xml is not valid', async () => {
      const convert = await nutshell.convert({ args: '--manifest DOES_NOT_EXIST.xml', exitCode: 1 });
      nutshell.expect.errorToHaveName(convert, 'Error');
    });
  });

  describe('--metadata flag', () => {
    let convertDir: string;

    for (const testCase of REPO.convert.metadata) {
      it(`should convert ${testCase.toConvert}`, async () => {
        await nutshell.convert({ args: `--metadata ${testCase.toConvert} --outputdir out` });

        convertDir = path.join(process.cwd(), 'out');
        if (isSourcePlugin()) {
          const sdrConvertDirName = shelljs.ls(convertDir)[0];
          convertDir = path.join(convertDir, sdrConvertDirName);
        }
        await nutshell.expect.directoryToHaveSomeFiles(convertDir);
        await nutshell.expect.fileToExist(path.join(convertDir, 'package.xml'));
        await nutshell.expect.filesToBeConverted(convertDir, testCase.toVerify);
      });
    }

    afterEach(() => {
      shelljs.rm('-rf', convertDir);
    });

    it('should throw an error if the metadata is not valid', async () => {
      const convert = await nutshell.convert({ args: '--metadata DOES_NOT_EXIST', exitCode: 1 });
      const expectedError = isSourcePlugin() ? 'RegistryError' : 'UnsupportedType';
      nutshell.expect.errorToHaveName(convert, expectedError);
    });
  });

  describe('--sourcepath flag', () => {
    let convertDir: string;

    for (const testCase of REPO.convert.sourcepath) {
      it(`should convert ${testCase.toConvert}`, async () => {
        await nutshell.convert({ args: `--sourcepath ${testCase.toConvert} --outputdir out` });

        convertDir = path.join(process.cwd(), 'out');
        if (isSourcePlugin()) {
          const sdrConvertDirName = shelljs.ls(convertDir)[0];
          convertDir = path.join(convertDir, sdrConvertDirName);
        }
        await nutshell.expect.directoryToHaveSomeFiles(convertDir);
        await nutshell.expect.fileToExist(path.join(convertDir, 'package.xml'));
        await nutshell.expect.filesToBeConverted(convertDir, testCase.toVerify);
      });
    }

    it('should throw an error if the sourcepath is not valid', async () => {
      const convert = await nutshell.convert({ args: '--sourcepath DOES_NOT_EXIST', exitCode: 1 });
      const expectedError = isSourcePlugin() ? 'SfdxError' : 'SourcePathInvalid';
      nutshell.expect.errorToHaveName(convert, expectedError);
    });
  });
});
