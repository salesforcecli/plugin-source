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
context('MPD Deploy NUTs [exec: %EXECUTABLE%]', () => {
  let nutshell: Nutshell;

  before(async () => {
    nutshell = await Nutshell.create({
      repository: 'https://github.com/salesforcecli/sample-project-multiple-packages.git',
      executable: EXECUTABLE,
      nut: __filename,
    });
  });

  after(async () => {
    await nutshell?.clean();
  });

  describe('CustomLabels', () => {
    // NOTE these are glob patterns so there's no need to use path.join here
    const forceAppLabels = 'force-app/main/default/labels/CustomLabels.labels-meta.xml';
    const myAppLabels = 'my-app/labels/CustomLabels.labels-meta.xml';

    describe('--sourcepath', () => {
      it('should deploy all CustomLabels from a single package', async () => {
        await nutshell.deploy({ args: `--sourcepath ${path.join('force-app', 'main', 'default', 'labels')}` });
        await nutshell.expect.filesToBeDeployed([forceAppLabels]);
      });

      it('should deploy all CustomLabels from multiple packages', async () => {
        await nutshell.deploy({
          args: `--sourcepath ${path.join('force-app', 'main', 'default', 'labels')},${path.join('my-app', 'labels')}`,
        });
        await nutshell.expect.filesToBeDeployed([forceAppLabels, myAppLabels]);
      });
    });

    describe('--metadata', () => {
      it('should deploy all CustomLabels', async () => {
        await nutshell.deploy({ args: '--metadata CustomLabels' });
        await nutshell.expect.filesToBeDeployed([forceAppLabels]);
      });

      it('should deploy individual CustomLabel', async () => {
        await nutshell.deploy({ args: '--metadata CustomLabel:force_app_Label_1' });
        await nutshell.expect.filesToBeDeployed([forceAppLabels]);
      });

      it('should deploy multiple individual CustomLabel', async () => {
        await nutshell.deploy({ args: '--metadata CustomLabel:force_app_Label_1,CustomLabel:my_app_Label_1' });
        await nutshell.expect.filesToBeDeployed([forceAppLabels, myAppLabels]);
      });
    });
  });
});
