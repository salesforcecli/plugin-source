/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { SourceTestkit } from '@salesforce/source-testkit';
import { getBoolean, getString } from '@salesforce/ts-types';
import { Result } from '@salesforce/source-testkit/lib/types';
import { execCmd } from '@salesforce/cli-plugins-testkit';
import { RequestStatus } from '@salesforce/source-deploy-retrieve';
import { expect } from 'chai';
import { TEST_REPOS_MAP } from '../testMatrix';
import { DeployCancelCommandResult } from '../../../src/formatters/deployCancelResultFormatter';

// DO NOT TOUCH. generateNuts.ts will insert these values
const REPO = TEST_REPOS_MAP.get('%REPO_URL%');

context('Async Deploy NUTs [name: %REPO_NAME%]', () => {
  let testkit: SourceTestkit;

  before(async () => {
    testkit = await SourceTestkit.create({
      repository: REPO.gitUrl,
      nut: __filename,
    });
    // an initial deploy to initialize testkit source tracking
    await testkit.deploy({ args: `--sourcepath ${testkit.packageNames.join(',')}` });
  });

  after(async () => {
    try {
      await testkit?.clean();
    } catch (e) {
      // if the it fails to clean, don't throw so NUTs will pass
      // eslint-disable-next-line no-console
      console.log('Clean Failed: ', e);
    }
  });

  describe('async deploy', () => {
    it('should return an id immediately when --wait is set to 0 and deploy:report should report results', async () => {
      // delete the lwc test stubs which will cause errors with the source tracking/globbing
      await testkit.deleteGlobs(['force-app/test/**/*']);

      const deploy = await testkit.deploy({
        args: `--sourcepath ${testkit.packageNames.join(',')} --wait 0`,
      });
      // test the stashed deploy id
      const report = (await testkit.deployReport({
        args: '--coverageformatters clover --junit',
      })) as Result<{ id: string; result: { id: string } }>;

      testkit.expect.toHaveProperty(deploy.result, 'id');
      testkit.expect.toHavePropertyAndNotValue(deploy.result, 'status', 'Succeeded');

      const status = getBoolean(report.result, 'done');
      if (status) {
        // if the deploy finished, expect changes and a 'succeeded' status
        testkit.expect.toHavePropertyAndValue(report.result, 'status', 'Succeeded');
        testkit.expect.toHaveProperty(report.result, 'numberComponentsDeployed');
        testkit.expect.toHaveProperty(report.result, 'deployedSource');
        testkit.expect.toHaveProperty(report.result, 'deploys');
      } else {
        // the deploy could be InProgress, Pending, or Queued, at this point
        expect(['Pending', 'InProgress', 'Queued']).to.include(getString(report.result, 'status'));
        await testkit.expect.filesToNotBeDeployed(testkit.packageGlobs);
      }
    });

    // sample-multiple-package-project deploys too quickly with SDR to cancel
    if (REPO.gitUrl.includes('dreamhouse')) {
      it('should return an id immediately when --wait is set to 0 and deploy:cancel should cancel the deploy', async () => {
        await testkit.deleteGlobs(['force-app/test/**/*']);

        const deploy = await testkit.deploy({
          args: `--sourcepath ${testkit.packageNames.join(',')} --wait 0`,
        });
        testkit.expect.toHaveProperty(deploy.result, 'id');

        const result = execCmd<DeployCancelCommandResult>(`force:source:deploy:cancel -i ${deploy.result.id} --json`);

        if (result.jsonOutput.status === 0) {
          // a successful cancel
          const json = result.jsonOutput.result;
          expect(json).to.have.property('canceledBy');
          expect(json).to.have.property('status');
          expect(json.status).to.equal(RequestStatus.Canceled);
          expect(json.id).to.equal(deploy.result.id);
        } else if (result.jsonOutput.status === 1 && result.jsonOutput.result) {
          // status = 1 because the deploy is in Succeeded status
          const json = result.jsonOutput.result;
          expect(json.status).to.equal(RequestStatus.Succeeded);
        } else {
          // the other allowable error is that the server is telling us the deploy succeeded
          expect(result.jsonOutput.name, JSON.stringify(result)).to.equal('CancelFailed');
          expect(result.jsonOutput.message, JSON.stringify(result)).to.equal(
            'The cancel command failed due to: INVALID_ID_FIELD: Deployment already completed'
          );
        }
      });
    }
  });
});
