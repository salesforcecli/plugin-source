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

const PACKAGE = { id: '04t6A000002zgKSQAY', name: 'ElectronBranding' };

context('Retrieve packagenames NUTs [exec: %EXECUTABLE%]', () => {
  let nutshell: Nutshell;

  before(async () => {
    nutshell = await Nutshell.create({
      repository: 'https://github.com/salesforcecli/sample-project-multiple-packages.git',
      executable: EXECUTABLE,
      nut: __filename,
    });
    nutshell.installPackage(PACKAGE.id);
    await nutshell.deploy({ args: `--sourcepath ${nutshell.packageNames.join(',')}` });
  });

  after(async () => {
    await nutshell?.clean();
  });

  describe('--packagenames flag', () => {
    it('should retrieve an installed package', async () => {
      await nutshell.retrieve({ args: `--packagenames "${PACKAGE.name}"` });
      await nutshell.expect.packagesToBeRetrieved([PACKAGE.name]);
    });

    it('should retrieve an installed package and sourcepath', async () => {
      await nutshell.retrieve({
        args: `--packagenames "${PACKAGE.name}" --sourcepath "${path.join('force-app', 'main', 'default', 'apex')}"`,
      });
      await nutshell.expect.packagesToBeRetrieved([PACKAGE.name]);
      await nutshell.expect.filesToExist([
        `${PACKAGE.name}/**/brandingSets/*`,
        `${PACKAGE.name}/**/contentassets/*`,
        `${PACKAGE.name}/**/lightningExperienceThemes/*`,
      ]);
    });
  });
});
