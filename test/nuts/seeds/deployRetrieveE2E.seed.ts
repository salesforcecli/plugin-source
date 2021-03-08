/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { NutButter } from '../nutButter';
import { RepoConfig } from '../testMatrix';

// DO NOT TOUCH. generateNuts.ts will insert these values
const REPO = { gitUrl: '' } as RepoConfig;
const EXECUTABLE = '';

context.skip('Deploy/Retrieve NUTs %REPO% %EXEC%', () => {
  let nutButter: NutButter;

  before(async () => {
    nutButter = await NutButter.create({ repository: REPO.gitUrl, executable: EXECUTABLE });
  });

  after(async () => {
    await nutButter?.clean();
  });

  it('should deploy with sourcepath flag set to package directory', async () => {
    for (const pkg of nutButter.packages) {
      const deploy = await nutButter.deploy({ args: `--sourcepath ${pkg.name}` });
      await nutButter.expect.allMetaXmlsToBeDeployed(deploy.result, pkg.fullPath);
    }
  });

  it('should retrieve with sourcepath flag set to package directory', async () => {
    for (const pkg of nutButter.packages) {
      const deploy = await nutButter.retrieve({ args: `--sourcepath ${pkg.name}` });
      await nutButter.expect.allMetaXmlsToBeRetrieved(deploy.result, pkg.fullPath);
    }
  });

  it('should retrieve sourcepath and overwrite local changes', async () => {
    // await nutButter.trackFile(...REPO.filesToTrack);
    // await nutButter.deploy(`--sourcepath ${nutButter.packages[0].name}`);
    // await nutButter.modifyLocalFile(REPO.filesToTrack[0]);
    // await nutButter.retrieve(`--sourcepath ${nutButter.packages[0].name}`);
    // nutButter.expect.fileToBeChanged(REPO.filesToTrack[0]);
  });

  it('should deploy with sourcepath flag set to multiple package directories', async () => {
    const packages = nutButter.packages.map((p) => p.name).join(',');
    const deploy = await nutButter.deploy({ args: `--sourcepath ${packages}` });
    await nutButter.expect.allMetaXmlsToBeDeployed(deploy.result, ...nutButter.packages.map((p) => p.fullPath));
  });

  it('should deploy with metadata flag set', async () => {
    const deploy = await nutButter.deploy({ args: '--metadata ApexClass' });
    await nutButter.expect.specificMetadataToBeDeployed(deploy.result, 'ApexClass');
  });
});
