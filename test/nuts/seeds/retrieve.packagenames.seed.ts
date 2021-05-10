/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import { Nutshell } from '../nutshell';

// DO NOT TOUCH. generateNuts.ts will insert these values
const EXECUTABLE = '%EXECUTABLE%';

const ELECTRON = { id: '04t6A000002zgKSQAY', name: 'ElectronBranding' };
const SKUID = { id: '04t4A000000cESSQA2', name: 'Skuid' };

context.skip('Retrieve packagenames NUTs [exec: %EXECUTABLE%]', () => {
  let nutshell: Nutshell;

  before(async () => {
    nutshell = await Nutshell.create({
      repository: 'https://github.com/salesforcecli/sample-project-multiple-packages.git',
      executable: EXECUTABLE,
      nut: __filename,
    });
    nutshell.installPackage(ELECTRON.id);
    await nutshell.deploy({ args: `--sourcepath ${nutshell.packageNames.join(',')}` });
  });

  after(async () => {
    await nutshell?.clean();
  });

  describe('--packagenames flag', () => {
    it('should retrieve an installed package', async () => {
      await nutshell.retrieve({ args: `--packagenames "${ELECTRON.name}"` });
      await nutshell.expect.packagesToBeRetrieved([ELECTRON.name]);
    });

    it('should retrieve two installed packages', async () => {
      nutshell.installPackage(SKUID.id);
      await nutshell.retrieve({ args: `--packagenames "${ELECTRON.name}, ${SKUID.name}"` });
      await nutshell.expect.packagesToBeRetrieved([ELECTRON.name, SKUID.name]);
    });

    it('should retrieve an installed package and sourcepath', async () => {
      await nutshell.retrieve({
        args: `--packagenames "${ELECTRON.name}" --sourcepath "${path.join('force-app', 'main', 'default', 'apex')}"`,
      });
      await nutshell.expect.packagesToBeRetrieved([ELECTRON.name]);
      await nutshell.expect.filesToExist([
        `${ELECTRON.name}/**/brandingSets/*`,
        `${ELECTRON.name}/**/contentassets/*`,
        `${ELECTRON.name}/**/lightningExperienceThemes/*`,
      ]);
    });
  });
});
