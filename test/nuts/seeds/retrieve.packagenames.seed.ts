/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import { SourceTestkit } from '@salesforce/source-testkit';
import { exec } from 'shelljs';

// DO NOT TOUCH. generateNuts.ts will insert these values
const EXECUTABLE = '%EXECUTABLE%';

const ELECTRON = { id: '04t6A000002zgKSQAY', name: 'ElectronBranding' };
const ESCAPEROOM = { id: '04t0P000000JFs1QAG', name: 'DFXP Escape Room' };

context('Retrieve packagenames NUTs [exec: %EXECUTABLE%]', () => {
  let testkit: SourceTestkit;

  before(async () => {
    testkit = await SourceTestkit.create({
      repository: 'https://github.com/salesforcecli/sample-project-multiple-packages.git',
      executable: EXECUTABLE,
      nut: __filename,
    });
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

  describe('--packagenames flag', () => {
    it('should retrieve an installed package', async () => {
      exec(`sfdx force:package:install --noprompt --package ${ELECTRON.id} --wait 5 --json`, { silent: true });

      await testkit.retrieve({ args: `--packagenames "${ELECTRON.name}"` });
      await testkit.expect.packagesToBeRetrieved([ELECTRON.name]);
    });

    it('should retrieve two installed packages', async () => {
      exec(`sfdx force:package:install --noprompt --package ${ELECTRON.id} --wait 5 --json`, { silent: true });
      exec(`sfdx force:package:install --noprompt --package ${ESCAPEROOM.id} --wait 5 --json`, { silent: true });

      await testkit.retrieve({ args: `--packagenames "${ELECTRON.name}, ${ESCAPEROOM.name}"` });
      await testkit.expect.packagesToBeRetrieved([ELECTRON.name, ESCAPEROOM.name]);
    });

    it('should retrieve an installed package and sourcepath', async () => {
      exec(`sfdx force:package:install --noprompt --package ${ELECTRON.id} --wait 5 --json`, { silent: true });

      await testkit.retrieve({
        args: `--packagenames "${ELECTRON.name}" --sourcepath "${path.join('force-app', 'main', 'default', 'apex')}"`,
      });
      await testkit.expect.packagesToBeRetrieved([ELECTRON.name]);
      await testkit.expect.filesToExist([
        `${ELECTRON.name}/**/brandingSets/*`,
        `${ELECTRON.name}/**/contentassets/*`,
        `${ELECTRON.name}/**/lightningExperienceThemes/*`,
      ]);
    });
  });
});
