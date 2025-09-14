/*
 * Copyright 2025, Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SourceTestkit } from '@salesforce/source-testkit';
import { execCmd } from '@salesforce/cli-plugins-testkit';

const ELECTRON = { id: '04t6A000002zgKSQAY', name: 'ElectronBranding' };
const ESCAPEROOM = { id: '04t0P000000JFs1QAG', name: 'DFXP Escape Room' };

context('Retrieve packagenames NUTs', () => {
  let testkit: SourceTestkit;

  before(async () => {
    testkit = await SourceTestkit.create({
      repository: 'https://github.com/salesforcecli/sample-project-multiple-packages.git',
      nut: fileURLToPath(import.meta.url),
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
      execCmd(`force:package:install --noprompt --package ${ELECTRON.id} --wait 5 --json`, { silent: true, cli: 'sf' });

      await testkit.retrieve({ args: `--packagenames "${ELECTRON.name}"` });
      await testkit.expect.packagesToBeRetrieved([ELECTRON.name]);
    });

    it('should retrieve two installed packages', async () => {
      execCmd(`force:package:install --noprompt --package ${ELECTRON.id} --wait 5 --json`, {
        silent: true,
        cli: 'sf',
        ensureExitCode: 0,
      });
      execCmd(`force:package:install --noprompt --package ${ESCAPEROOM.id} --wait 5 --json`, {
        silent: true,
        cli: 'sf',
        ensureExitCode: 0,
      });

      await testkit.retrieve({ args: `--packagenames "${ELECTRON.name}, ${ESCAPEROOM.name}"` });
      await testkit.expect.packagesToBeRetrieved([ELECTRON.name, ESCAPEROOM.name]);
    });

    it('should retrieve an installed package and sourcepath', async () => {
      execCmd(`force:package:install --noprompt --package ${ELECTRON.id} --wait 5 --json`, {
        silent: true,
        cli: 'sf',
        ensureExitCode: 0,
      });

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
