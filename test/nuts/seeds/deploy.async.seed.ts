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

context('Async Deploy NUTs %REPO% %EXEC%', () => {
  let nutshell: Nutshell;

  before(async function () {
    nutshell = await Nutshell.create({
      repository: REPO.gitUrl,
      executable: EXECUTABLE,
      context: this.test?.parent.title,
    });
  });

  after(async () => {
    await nutshell?.clean();
  });

  it('should deploy the entire project', async () => {
    const deploy = await nutshell.deploy({ args: `--sourcepath ${nutshell.packageNames.join(',')}` });
    nutshell.expect.deployJsonToBeValid(deploy.result);
    await nutshell.expect.allMetaXmlsToBeDeployed(deploy.result, ...nutshell.packagePaths);
  });

  describe('async deploy', () => {
    it('should return an id immediately when --wait is set to 0 and deploy:report should report results', async () => {
      const deploy = await nutshell.deploy<ComplexDeployResult>({
        args: `--sourcepath ${nutshell.packageNames.join(',')} --wait 0`,
      });

      nutshell.expect.toHaveProperty(deploy.result, 'id');
      nutshell.expect.toHavePropertyAndNotValue(deploy.result, 'status', 'Succeeded');

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
      nutshell.expect.toHavePropertyAndNotValue(deploy.result, 'status', 'Succeeded');

      const cancel = await nutshell.deployCancel({ args: `-i ${deploy.result.id}` });
      nutshell.expect.deployCancelJsonToBeValid(cancel.result);
    });
  });
});
