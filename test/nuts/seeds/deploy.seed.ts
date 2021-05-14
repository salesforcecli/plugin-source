/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import { Nutshell } from '../nutshell';
import { TEST_REPOS_MAP } from '../testMatrix';
import { Result } from '../types';

// DO NOT TOUCH. generateNuts.ts will insert these values
const REPO = TEST_REPOS_MAP.get('%REPO_URL%');
const EXECUTABLE = '%EXECUTABLE%';

context.skip('Deploy NUTs [name: %REPO_NAME%] [exec: %EXECUTABLE%]', () => {
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

  /**
   * SOURCEPATH
   */
  describe('--sourcepath flag', () => {
    for (const testCase of REPO.deploy.sourcepath) {
      const toDeploy = path.normalize(testCase.toDeploy);
      it(`should deploy ${toDeploy}`, async () => {
        await nutshell.deploy({ args: `--sourcepath ${toDeploy}` });
        await nutshell.expect.filesToBeDeployed(testCase.toVerify, testCase.toIgnore);
      });
    }

    it('should throw an error if the sourcepath is not valid', async () => {
      const deploy = await nutshell.deploy({ args: '--sourcepath DOES_NOT_EXIST', exitCode: 1 });
      const expectedError = nutshell.isSourcePlugin() ? 'SfdxError' : 'SourcePathInvalid';
      nutshell.expect.errorToHaveName(deploy, expectedError);
    });
  });

  /**
   * METADATA
   */
  describe('--metadata flag', () => {
    for (const testCase of REPO.deploy.metadata) {
      const toDeploy = path.normalize(testCase.toDeploy);
      it(`should deploy ${toDeploy}`, async () => {
        await nutshell.deploy({ args: `--metadata ${toDeploy}` });
        await nutshell.expect.filesToBeDeployed(testCase.toVerify, testCase.toIgnore);
      });
    }

    it('should throw an error if the metadata is not valid', async () => {
      const deploy = await nutshell.deploy({ args: '--metadata DOES_NOT_EXIST', exitCode: 1 });
      const expectedError = nutshell.isSourcePlugin() ? 'RegistryError' : 'UnsupportedType';
      nutshell.expect.errorToHaveName(deploy, expectedError);
    });

    it('should not deploy metadata outside of a package directory', async () => {
      let apex: Result<{ created: string[] }>;
      try {
        // process.env.TESTKIT_EXECUTABLE_PATH = shelljs.which('sfdx');
        apex = await nutshell.createApexClass({ args: '--outputdir NotAPackage --classname ShouldNotBeDeployed' });
      } finally {
        // delete process.env.TESTKIT_EXECUTABLE_PATH;
      }

      await nutshell.deploy({ args: '--metadata ApexClass' });
      await nutshell.expect.filesToNotBeDeployed(apex.result.created);
    });
  });

  /**
   * MANIFEST
   */
  // tf with force-app,my-app,foo-bar
  describe('--manifest flag', () => {
    for (const testCase of REPO.deploy.manifest) {
      const toDeploy = path.normalize(testCase.toDeploy);
      it(`should deploy ${toDeploy}`, async () => {
        // generate package.xml to use with the --manifest param
        await nutshell.convert({ args: `--sourcepath ${toDeploy} --outputdir out` });
        const outputDir = path.join(process.cwd(), 'out');
        nutshell.findAndMoveManifest(outputDir);
        const packageXml = path.join(process.cwd(), 'package.xml');

        await nutshell.modifyLocalGlobs(testCase.toVerify);
        await nutshell.deploy({ args: `--manifest ${packageXml}` });
        await nutshell.expect.filesToBeChanged(testCase.toVerify, testCase.toIgnore);
      });
    }

    it('should throw an error if the package.xml is not valid', async () => {
      const deploy = await nutshell.deploy({ args: '--manifest DOES_NOT_EXIST.xml', exitCode: 1 });
      const expectedError = nutshell.isSourcePlugin() ? 'Error' : 'InvalidManifestError';
      nutshell.expect.errorToHaveName(deploy, expectedError);
    });
  });
});
