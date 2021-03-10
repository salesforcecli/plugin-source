/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ComplexDeployResult } from '../types';
import { Nutshell } from '../nutshell';
import { RepoConfig } from '../testMatrix';

// DO NOT TOUCH. generateNuts.ts will insert these values
const REPO = { gitUrl: '' } as RepoConfig;
const EXECUTABLE = '';

context('Deploy testlevel NUTs %REPO% %EXEC%', () => {
  let nutshell: Nutshell;

  before(async () => {
    nutshell = await Nutshell.create({
      repository: REPO.gitUrl,
      executable: EXECUTABLE,
      context: __filename,
    });
  });

  after(async () => {
    await nutshell?.clean();
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
    });
  });
});
