/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import { SourceTestkit } from '@salesforce/source-testkit';
import { TEST_REPOS_MAP } from '../../testMatrix';

const REPO = TEST_REPOS_MAP.get('https://github.com/trailheadapps/dreamhouse-lwc.git');
const EXECUTABLE = path.join(process.cwd(), 'bin', 'run');

context(
  `REST Deploy sourcepath NUTs [name: ${REPO.gitUrl.substr(REPO.gitUrl.lastIndexOf('/'))}] [exec: ${EXECUTABLE} ]`,
  () => {
    let testkit: SourceTestkit;

    before(async () => {
      process.env.SFDX_REST_DEPLOY = 'true';
      testkit = await SourceTestkit.create({
        repository: REPO.gitUrl,
        executable: EXECUTABLE,
        nut: __filename,
      });
    });

    after(async () => {
      try {
        delete process.env.SFDX_REST_DEPLOY;
        await testkit?.clean();
      } catch (e) {
        // if the it fails to clean, don't throw so NUTs will pass
        // eslint-disable-next-line no-console
        console.log('Clean Failed: ', e);
      }
    });

    describe('--sourcepath flag with singular directory', () => {
      const toDeploy = path.normalize('force-app/main/default/objects');
      it(`should deploy ${toDeploy}`, async () => {
        await testkit.deploy({ args: `--sourcepath ${toDeploy}` });
        await testkit.expect.filesToBeDeployed(['force-app/main/default/objects/**/*']);
      });
    });

    describe('--sourcepath flag with multiple directories', () => {
      const toDeploy = path.normalize('force-app/main/default/classes,force-app/main/default/objects');
      it(`should deploy ${toDeploy}`, async () => {
        await testkit.deploy({ args: `--sourcepath ${toDeploy}` });
        await testkit.expect.filesToBeDeployed([
          'force-app/main/default/classes/*',
          'force-app/main/default/objects/**/*',
        ]);
      });
    });
  }
);
