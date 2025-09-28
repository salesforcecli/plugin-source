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

context('MPD Deploy NUTs', () => {
  let testkit: SourceTestkit;

  before(async () => {
    testkit = await SourceTestkit.create({
      repository: 'https://github.com/salesforcecli/sample-project-multiple-packages.git',
      nut: fileURLToPath(import.meta.url),
    });
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

  describe('CustomLabels', () => {
    // NOTE these are glob patterns so there's no need to use path.join here
    const forceAppLabels = 'force-app/main/default/labels/CustomLabels.labels-meta.xml';
    const myAppLabels = 'my-app/labels/CustomLabels.labels-meta.xml';

    describe('--sourcepath', () => {
      it('should deploy all CustomLabels from a single package', async () => {
        await testkit.deploy({ args: `--sourcepath ${path.join('force-app', 'main', 'default', 'labels')}` });
        await testkit.expect.filesToBeDeployed([forceAppLabels]);
      });

      it('should deploy all CustomLabels from multiple packages', async () => {
        await testkit.deploy({
          args: `--sourcepath ${path.join('force-app', 'main', 'default', 'labels')},${path.join('my-app', 'labels')}`,
        });
        await testkit.expect.filesToBeDeployed([forceAppLabels, myAppLabels]);
      });
    });

    describe('--metadata', () => {
      it('should deploy all CustomLabels', async () => {
        await testkit.deploy({ args: '--metadata CustomLabels' });
        await testkit.expect.filesToBeDeployed([forceAppLabels]);
      });

      it('should deploy individual CustomLabel', async () => {
        await testkit.deploy({ args: '--metadata CustomLabel:force_app_Label_1' });
        await testkit.expect.filesToBeDeployed([forceAppLabels]);
      });

      it('should deploy multiple individual CustomLabel', async () => {
        await testkit.deploy({ args: '--metadata CustomLabel:force_app_Label_1,CustomLabel:my_app_Label_1' });
        await testkit.expect.filesToBeDeployed([forceAppLabels, myAppLabels]);
      });
    });
  });
});
