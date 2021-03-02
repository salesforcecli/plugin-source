/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Nutcase } from '../nutcase';
import { RepoConfig } from '../testMatrix';

// DO NOT TOUCH. generateNuts.ts will insert these values
const REPO = { gitUrl: '' } as RepoConfig;
const EXECUTABLE = '';

context.skip('Deploy/Retrieve NUTs %REPO% %EXEC%', () => {
  let nutcase: Nutcase;

  before(async () => {
    nutcase = await Nutcase.create({ repository: REPO.gitUrl, executable: EXECUTABLE });
  });

  after(async () => {
    await nutcase?.clean();
  });

  it('should deploy with sourcepath flag set to package directory', async () => {
    for (const pkg of nutcase.packages) {
      const deploy = await nutcase.deploy({ args: `--sourcepath ${pkg.name}` });
      await nutcase.expect.allMetaXmlsToBeDeployed(deploy.result, pkg.fullPath);
    }
  });

  it('should retrieve with sourcepath flag set to package directory', async () => {
    for (const pkg of nutcase.packages) {
      const deploy = await nutcase.retrieve({ args: `--sourcepath ${pkg.name}` });
      await nutcase.expect.allMetaXmlsToBeRetrieved(deploy.result, pkg.fullPath);
    }
  });

  it('should retrieve sourcepath and overwrite local changes', async () => {
    // await nutcase.trackFile(...REPO.filesToTrack);
    // await nutcase.deploy(`--sourcepath ${nutcase.packages[0].name}`);
    // await nutcase.modifyLocalFile(REPO.filesToTrack[0]);
    // await nutcase.retrieve(`--sourcepath ${nutcase.packages[0].name}`);
    // nutcase.expect.fileToBeChanged(REPO.filesToTrack[0]);
  });

  it('should deploy with sourcepath flag set to multiple package directories', async () => {
    const packages = nutcase.packages.map((p) => p.name).join(',');
    const deploy = await nutcase.deploy({ args: `--sourcepath ${packages}` });
    await nutcase.expect.allMetaXmlsToBeDeployed(deploy.result, ...nutcase.packages.map((p) => p.fullPath));
  });

  it('should deploy with metadata flag set', async () => {
    const deploy = await nutcase.deploy({ args: '--metadata ApexClass' });
    await nutcase.expect.specificMetadataToBeDeployed(deploy.result, 'ApexClass');
  });
});
