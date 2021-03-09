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

  describe.skip('--sourcepath flag', () => {
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

  describe.skip('--metadata flag', () => {
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

  describe.skip('--manifest flag', () => {
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

  describe.skip('--checkonly flag', () => {
    it('should check deploy of all packages', async () => {
      const deploy = await nutshell.deploy<ComplexDeployResult>({
        args: `--sourcepath ${nutshell.packageNames.join(',')} --checkonly`,
      });
      nutshell.expect.deployComplexJsonToBeValid(deploy.result);
    });
  });

  describe.skip('async deploy', () => {
    it('should return an id immediately when --wait is set to 0 and deploy:report should report results', async () => {
      const deploy = await nutshell.deploy<ComplexDeployResult>({
        args: `--sourcepath ${nutshell.packageNames.join(',')} --wait 0`,
      });

      nutshell.expect.toHaveProperty(deploy.result, 'id');
      nutshell.expect.toHavePropertyAndValue(deploy.result, 'status', 'Pending');

      const report = await nutshell.deployReport({ args: `-i ${deploy.result.id}` });
      nutshell.expect.toHaveProperty(report.result, 'details');
      nutshell.expect.toHavePropertyAndValue(report.result, 'status', 'Succeeded');
      nutshell.expect.deployReportJsonToBeValid(report.result);
    });

    it('should return an id immediately when --wait is set to 0 and deploy:cancel should cancel the deploy', async () => {
      const deploy = await nutshell.deploy<ComplexDeployResult>({
        args: `--sourcepath ${nutshell.packageNames.join(',')} --wait 0`,
      });
      nutshell.expect.toHaveProperty(deploy.result, 'id');
      nutshell.expect.toHavePropertyAndValue(deploy.result, 'status', 'Pending');

      const cancel = await nutshell.deployCancel({ args: `-i ${deploy.result.id}` });
      nutshell.expect.deployCancelJsonToBeValid(cancel.result);
    });
  });

  describe('--testlevel', () => {
    it('should run no tests (NoTestRun)', async () => {
      const deploy = await nutshell.deploy<ComplexDeployResult>({
        args: `--sourcepath ${nutshell.packageNames.join(',')} --testlevel NoTestRun --checkonly`,
      });
      nutshell.expect.deployComplexJsonToBeValid(deploy.result);
      nutshell.expect.deployTestResultsToBeValid(deploy.result.details.runTestResult);
      nutshell.expect.toHavePropertyAndValue(deploy.result.details.runTestResult, 'numTestsRun', '0');
    });

    it('should run tests locally (RunLocalTests)', async () => {
      const deploy = await nutshell.deploy<ComplexDeployResult>({
        args: `--sourcepath ${nutshell.packageNames.join(',')} --testlevel RunLocalTests --checkonly`,
      });
      nutshell.expect.deployComplexJsonToBeValid(deploy.result);
      nutshell.expect.deployTestResultsToBeValid(deploy.result.details.runTestResult);
      nutshell.expect.toHavePropertyAndNotValue(deploy.result.details.runTestResult, 'numTestsRun', '0');
    });

    it('should run tests in org (RunAllTestsInOrg)', async () => {
      const deploy = await nutshell.deploy<ComplexDeployResult>({
        args: `--sourcepath ${nutshell.packageNames.join(',')} --testlevel RunAllTestsInOrg --checkonly`,
      });
      nutshell.expect.deployComplexJsonToBeValid(deploy.result);
      nutshell.expect.deployTestResultsToBeValid(deploy.result.details.runTestResult);
      nutshell.expect.toHavePropertyAndNotValue(deploy.result.details.runTestResult, 'numTestsRun', '0');
    });

    it('should run specified tests in org (RunSpecifiedTests)', async () => {
      const packageNames = nutshell.packageNames.join(',');
      const tests = REPO.deploy.testlevel.specifiedTests.join(',');
      const deploy = await nutshell.deploy<ComplexDeployResult>({
        args: `--sourcepath ${packageNames} --testlevel RunSpecifiedTests --runtests ${tests} --checkonly --ignoreerrors`,
      });
      nutshell.expect.deployComplexJsonToBeValid(deploy.result);
      nutshell.expect.deployTestResultsToBeValid(deploy.result.details.runTestResult);
      nutshell.expect.toHavePropertyAndNotValue(deploy.result.details.runTestResult, 'numTestsRun', '0');
    });
  });

  describe.skip('quick deploy', () => {
    it('should return an id immediately when --wait is set to 0 and deploy:report should report results', async () => {
      const checkOnly = await nutshell.deploy<ComplexDeployResult>({
        args: `--sourcepath ${nutshell.packageNames.join(',')} --testlevel RunLocalTests --checkonly`,
      });
      nutshell.expect.toHaveProperty(checkOnly.result, 'id');

      const quickDeploy = await nutshell.deploy<ComplexDeployResult>({
        args: `--validateddeployrequestid ${checkOnly.result.id}`,
      });
      nutshell.expect.deployReportJsonToBeValid(quickDeploy.result);
      nutshell.expect.toHavePropertyAndValue(quickDeploy.result, 'status', 'Succeeded');
    });
  });
});
