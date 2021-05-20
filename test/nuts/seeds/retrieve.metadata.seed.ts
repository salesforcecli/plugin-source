/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import { Nutshell } from '../nutshell';
import { TEST_REPOS_MAP } from '../testMatrix';

// DO NOT TOUCH. generateNuts.ts will insert these values
const REPO = TEST_REPOS_MAP.get('%REPO_URL%');
const EXECUTABLE = '%EXECUTABLE%';

context.skip('Retrieve metadata NUTs [name: %REPO_NAME%] [exec: %EXECUTABLE%]', () => {
  let nutshell: Nutshell;

  before(async () => {
    nutshell = await Nutshell.create({
      repository: REPO.gitUrl,
      executable: EXECUTABLE,
      nut: __filename,
    });
    await nutshell.trackGlobs(nutshell.packageGlobs);
    await nutshell.deploy({ args: `--sourcepath ${nutshell.packageNames.join(',')}` });
  });

  after(async () => {
    await nutshell?.clean();
  });

  describe('--metadata flag', () => {
    for (const testCase of REPO.retrieve.metadata) {
      it(`should retrieve ${testCase.toRetrieve}`, async () => {
        await nutshell.modifyLocalGlobs(testCase.toVerify);
        await nutshell.retrieve({ args: `--metadata ${testCase.toRetrieve}` });
        await nutshell.expect.filesToBeChanged(testCase.toVerify, testCase.toIgnore);
      });
    }

    // the LWC is in the dreamhouse-lwc repo and is only deployed to dreamhouse projects
    // this sufficiently tests this metadata is WAD
    if (REPO.gitUrl.includes('dreamhouse') && nutshell && nutshell.isSourcePlugin()) {
      it('should ensure that -meta.xml file belongs to the .js not .css', async () => {
        // this will fail with toolbelt powered sfdx, but should pass with SDRL powered sfdx
        /**
         * NUT covering a specific bug in toolbelt
         * 1. create LWC and CSS component (daysOnMarket)
         * 2. deploy LWC
         * 3. delete LWC locally
         * 4. retrieve with -m LightningComponentBundle:daysOnMarket
         * the -meta.xml file would be associated with the .css file, not the .js file
         */
        const lwcPath = path.join('force-app', 'main', 'default', 'lwc');
        // deploy the LWC
        await nutshell.deploy({ args: `--sourcepath ${lwcPath}` });
        // delete the LWC locally
        await nutshell.deleteGlobs([lwcPath]);
        await nutshell.retrieve({ args: '--metadata LightningComponentBundle:daysOnMarket' });
        // ensure that the mycomponent.js-meta.xml file exists
        await nutshell.expect.fileToExist(`${path.join(lwcPath, 'daysOnMarket', 'daysOnMarket.js-meta.xml')}`);
      });
    }

    it('should throw an error if the metadata is not valid', async () => {
      const retrieve = await nutshell.retrieve({ args: '--metadata DOES_NOT_EXIST', exitCode: 1 });
      const expectedError = nutshell.isSourcePlugin() ? 'RegistryError' : 'UnsupportedType';
      nutshell.expect.errorToHaveName(retrieve, expectedError);
    });
  });
});
