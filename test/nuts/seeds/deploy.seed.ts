/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import { ComplexDeployResult } from '../types';
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
    nutButter.expect.deployJsonToBeValid(deploy.result);
    await nutButter.expect.allMetaXmlsToBeDeployed(deploy.result, ...nutButter.packagePaths);
  });

  describe('--sourcepath flag', () => {
    for (const testCase of REPO.deploy.sourcepath) {
      it(`should deploy ${testCase.toDeploy}`, async () => {
        const deploy = await nutButter.deploy({ args: `--sourcepath ${testCase.toDeploy}` });
        nutButter.expect.deployJsonToBeValid(deploy.result);
        await nutButter.expect.filesToBeDeployed(deploy.result, testCase.toVerify);
      });
    }

    it('should throw an error if the sourcepath is not valid', async () => {
      const deploy = await nutButter.deploy({ args: '--sourcepath DOES_NOT_EXIST', exitCode: 1 });
      nutButter.expect.errorToHaveName(deploy, 'SourcePathInvalid');
    });
  });

  describe('--metadata flag', () => {
    for (const testCase of REPO.deploy.metadata) {
      it(`should deploy ${testCase.toDeploy}`, async () => {
        const deploy = await nutButter.deploy({ args: `--metadata ${testCase.toDeploy}` });
        nutButter.expect.deployJsonToBeValid(deploy.result);
        await nutButter.expect.filesToBeDeployed(deploy.result, testCase.toVerify);
      });
    }

    it('should throw an error if the metadata is not valid', async () => {
      const deploy = await nutButter.deploy({ args: '--metadata DOES_NOT_EXIST', exitCode: 1 });
      nutButter.expect.errorToHaveName(deploy, 'UnsupportedType');
    });
  });

  describe('--manifest flag', () => {
    for (const testCase of REPO.deploy.manifest) {
      it(`should deploy ${testCase.toDeploy}`, async () => {
        const convert = await nutButter.convert({ args: `--sourcepath ${testCase.toDeploy} --outputdir out` });
        nutButter.expect.convertJsonToBeValid(convert.result);
        const packageXml = path.join(convert.result.location, 'package.xml');

        const deploy = await nutButter.deploy({ args: `--manifest ${packageXml}` });
        nutButter.expect.deployJsonToBeValid(deploy.result);
        await nutButter.expect.filesToBeDeployed(deploy.result, testCase.toVerify);
      });
    }

    it('should throw an error if the package.xml is not valid', async () => {
      const deploy = await nutButter.deploy({ args: '--manifest DOES_NOT_EXIST.xml', exitCode: 1 });
      nutButter.expect.errorToHaveName(deploy, 'InvalidManifestError');
    });
  });

  describe('--checkonly flag', () => {
    it('should check deploy of all packages', async () => {
      const deploy = await nutButter.deploy<ComplexDeployResult>({
        args: `--sourcepath ${nutButter.packageNames.join(',')} --checkonly`,
      });
      nutButter.expect.deployVerboseJsonToBeValid(deploy.result);
      await nutButter.expect.filesToBeDeployedVerbose(deploy.result, nutButter.packageNames);
    });
  });

  describe('async deploy', () => {
    it('should return an id immediately when --wait is set to 0 and deploy:report should report results', async () => {
      const deploy = await nutButter.deploy<ComplexDeployResult>({
        args: `--sourcepath ${nutButter.packageNames.join(',')} --wait 0`,
      });
      nutButter.expect.toHaveProperty(deploy.result, 'id');

      const report = await nutButter.deployReport({ args: `-i ${deploy.result.id}` });
      nutButter.expect.toHaveProperty(report.result, 'details');
      nutButter.expect.toHavePropertyAndValue(report.result, 'status', 'Succeeded');
    });

    it('should return an id immediately when --wait is set to 0 and deploy:cancel should cancel the deploy', async () => {
      const deploy = await nutButter.deploy<ComplexDeployResult>({
        args: `--sourcepath ${nutButter.packageNames.join(',')} --wait 0`,
      });
      nutButter.expect.toHaveProperty(deploy.result, 'id');

      const cancel = await nutButter.deployCancel({ args: `-i ${deploy.result.id}` });

      nutButter.expect.toHaveProperty(cancel.result, 'details');
      nutButter.expect.toHaveProperty(cancel.result, 'canceledBy');
      nutButter.expect.toHavePropertyAndValue(cancel.result, 'status', 'Canceled');
    });
  });
});
