/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import { ComplexDeployResult } from '../types';
import { Nutshell } from '../nutshell';
import { RepoConfig } from '../testMatrix';

// DO NOT TOUCH. generateNuts.ts will insert these values
const REPO = { gitUrl: '' } as RepoConfig;
const EXECUTABLE = '';

context('Deploy NUTs %REPO% %EXEC%', () => {
  let nutshell: Nutshell;

  before(async () => {
    nutshell = await Nutshell.create({ repository: REPO.gitUrl, executable: EXECUTABLE });
  });

  after(async () => {
    await nutshell?.clean();
  });

  it('should deploy the entire project', async () => {
    const deploy = await nutshell.deploy({ args: `--sourcepath ${nutshell.packageNames.join(',')}` });
    nutshell.expect.deployJsonToBeValid(deploy.result);
    await nutshell.expect.allMetaXmlsToBeDeployed(deploy.result, ...nutshell.packagePaths);
  });

  describe('--sourcepath flag', () => {
    for (const testCase of REPO.deploy.sourcepath) {
      it(`should deploy ${testCase.toDeploy}`, async () => {
        const deploy = await nutshell.deploy({ args: `--sourcepath ${testCase.toDeploy}` });
        nutshell.expect.deployJsonToBeValid(deploy.result);
        await nutshell.expect.filesToBeDeployed(deploy.result, testCase.toVerify);
      });
    }

    it('should throw an error if the sourcepath is not valid', async () => {
      const deploy = await nutshell.deploy({ args: '--sourcepath DOES_NOT_EXIST', exitCode: 1 });
      nutshell.expect.errorToHaveName(deploy, 'SourcePathInvalid');
    });
  });

  describe('--metadata flag', () => {
    for (const testCase of REPO.deploy.metadata) {
      it(`should deploy ${testCase.toDeploy}`, async () => {
        const deploy = await nutshell.deploy({ args: `--metadata ${testCase.toDeploy}` });
        nutshell.expect.deployJsonToBeValid(deploy.result);
        await nutshell.expect.filesToBeDeployed(deploy.result, testCase.toVerify);
      });
    }

    it('should throw an error if the metadata is not valid', async () => {
      const deploy = await nutshell.deploy({ args: '--metadata DOES_NOT_EXIST', exitCode: 1 });
      nutshell.expect.errorToHaveName(deploy, 'UnsupportedType');
    });
  });

  describe('--manifest flag', () => {
    for (const testCase of REPO.deploy.manifest) {
      it(`should deploy ${testCase.toDeploy}`, async () => {
        const convert = await nutshell.convert({ args: `--sourcepath ${testCase.toDeploy} --outputdir out` });
        nutshell.expect.convertJsonToBeValid(convert.result);
        const packageXml = path.join(convert.result.location, 'package.xml');

        const deploy = await nutshell.deploy({ args: `--manifest ${packageXml}` });
        nutshell.expect.deployJsonToBeValid(deploy.result);
        await nutshell.expect.filesToBeDeployed(deploy.result, testCase.toVerify);
      });
    }

    it('should throw an error if the package.xml is not valid', async () => {
      const deploy = await nutshell.deploy({ args: '--manifest DOES_NOT_EXIST.xml', exitCode: 1 });
      nutshell.expect.errorToHaveName(deploy, 'InvalidManifestError');
    });
  });

  describe('--checkonly flag', () => {
    it('should check deploy of all packages', async () => {
      const deploy = await nutshell.deploy<ComplexDeployResult>({
        args: `--sourcepath ${nutshell.packageNames.join(',')} --checkonly`,
      });
      nutshell.expect.deployVerboseJsonToBeValid(deploy.result);
      await nutshell.expect.filesToBeDeployedVerbose(deploy.result, nutshell.packageNames);
    });
  });

  describe('async deploy', () => {
    it('should return an id immediately when --wait is set to 0 and deploy:report should report results', async () => {
      const deploy = await nutshell.deploy<ComplexDeployResult>({
        args: `--sourcepath ${nutshell.packageNames.join(',')} --wait 0`,
      });
      nutshell.expect.toHaveProperty(deploy.result, 'id');

      const report = await nutshell.deployReport({ args: `-i ${deploy.result.id}` });
      nutshell.expect.toHaveProperty(report.result, 'details');
      nutshell.expect.toHavePropertyAndValue(report.result, 'status', 'Succeeded');
    });

    it('should return an id immediately when --wait is set to 0 and deploy:cancel should cancel the deploy', async () => {
      const deploy = await nutshell.deploy<ComplexDeployResult>({
        args: `--sourcepath ${nutshell.packageNames.join(',')} --wait 0`,
      });
      nutshell.expect.toHaveProperty(deploy.result, 'id');

      const cancel = await nutshell.deployCancel({ args: `-i ${deploy.result.id}` });

      nutshell.expect.toHaveProperty(cancel.result, 'details');
      nutshell.expect.toHaveProperty(cancel.result, 'canceledBy');
      nutshell.expect.toHavePropertyAndValue(cancel.result, 'status', 'Canceled');
    });
  });
});
