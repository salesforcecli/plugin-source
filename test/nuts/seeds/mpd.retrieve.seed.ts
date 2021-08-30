/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Dictionary } from '@salesforce/ts-types';
import { SourceTestkit } from '@salesforce/source-testkit';

// DO NOT TOUCH. generateNuts.ts will insert these values
const EXECUTABLE = '%EXECUTABLE%';

context('MPD Retrieve NUTs [exec: %EXECUTABLE%]', () => {
  let testkit: SourceTestkit;

  before(async () => {
    testkit = await SourceTestkit.create({
      repository: 'https://github.com/salesforcecli/sample-project-multiple-packages.git',
      executable: EXECUTABLE,
      nut: __filename,
    });
    await testkit.trackGlobs(testkit.packageGlobs);
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

  describe('CustomObjects', () => {
    it('should put CustomObjects and CustomFields into appropriate package directory', async () => {
      const objectsAndFields = ['force-app/main/default/objects/MyObj__c/*', 'my-app/objects/MyObj__c/fields/*'];
      await testkit.modifyLocalGlobs(objectsAndFields);
      await testkit.retrieve({ args: '--metadata CustomObject' });
      await testkit.expect.filesToBeDeployed(objectsAndFields);
      await testkit.expect.filesToNotExist([
        'force-app/main/default/objects/MyObj__c/fields/*',
        'my-app/objects/MyObj__c/MyObj__c.object.xml',
      ]);
    });
  });

  // Skipping if using sfdx executable because it does not support multiple CustomLabels files on retrieve
  (EXECUTABLE.includes('plugin-source') ? describe : describe.skip)('CustomLabels', () => {
    // NOTE these are glob patterns so there's no need to use path.join here
    const forceAppLabels = 'force-app/main/default/labels/CustomLabels.labels-meta.xml';
    const myAppLabels = 'my-app/labels/CustomLabels.labels-meta.xml';

    let originalState: Dictionary<string>;

    before(async () => {
      originalState = await testkit.readGlobs([forceAppLabels, myAppLabels]);
    });

    beforeEach(async () => {
      for (const [filename, contents] of Object.entries(originalState)) {
        await testkit.writeFile(filename, contents);
      }
    });

    describe('--metadata CustomLabels', () => {
      it('should put labels into appropriate CustomLabels file', async () => {
        await testkit.modifyLocalGlobs([forceAppLabels, myAppLabels]);
        await testkit.retrieve({ args: '--metadata CustomLabels' });

        await testkit.expect.filesToBeDeployed([forceAppLabels, myAppLabels]);
        await testkit.expect.filesToNotContainString(forceAppLabels, '<fullName>my_app_Label_1</fullName>');
        await testkit.expect.filesToNotContainString(
          myAppLabels,
          '<fullName>force_app_Label_1</fullName>',
          '<fullName>force_app_Label_2</fullName>'
        );
      });

      it('should put new labels into CustomLabels file in default package', async () => {
        // Delete local labels to simulate having new labels created in the org
        await testkit.deleteGlobs([myAppLabels]);
        await testkit.retrieve({ args: '--metadata CustomLabels' });

        await testkit.expect.filesToBeDeployed([forceAppLabels]);
        await testkit.expect.filesToContainString(
          forceAppLabels,
          '<fullName>my_app_Label_1</fullName>',
          '<fullName>force_app_Label_1</fullName>',
          '<fullName>force_app_Label_2</fullName>'
        );
      });

      it('should put new labels into existing CustomLabels file', async () => {
        // Delete local labels to simulate having new labels created in the org
        await testkit.deleteGlobs([forceAppLabels]);
        await testkit.retrieve({ args: '--metadata CustomLabels' });

        await testkit.expect.filesToBeDeployed([myAppLabels]);
        await testkit.expect.filesToContainString(
          myAppLabels,
          '<fullName>my_app_Label_1</fullName>',
          '<fullName>force_app_Label_1</fullName>',
          '<fullName>force_app_Label_2</fullName>'
        );
      });

      it('should put all labels into default CustomLabels file when no labels exist locally', async () => {
        // Delete local labels to simulate having new labels created in the org
        await testkit.deleteGlobs([forceAppLabels, myAppLabels]);
        await testkit.retrieve({ args: '--metadata CustomLabels' });

        await testkit.expect.filesToBeDeployed([forceAppLabels]);
        await testkit.expect.filesToContainString(
          forceAppLabels,
          '<fullName>my_app_Label_1</fullName>',
          '<fullName>force_app_Label_1</fullName>',
          '<fullName>force_app_Label_2</fullName>'
        );
      });
    });

    describe('--metadata CustomLabel:force_app_Label_1', () => {
      it('should put individual label into appropriate CustomLabels file', async () => {
        await testkit.retrieve({ args: '--metadata CustomLabel:force_app_Label_1' });

        await testkit.expect.filesToBeDeployed([forceAppLabels]);
        await testkit.expect.filesToNotBeChanged([myAppLabels]);
        await testkit.expect.filesToNotContainString(
          forceAppLabels,
          '<fullName>my_app_Label_1</fullName>',
          '<fullName>force_app_Label_2</fullName>'
        );
        await testkit.expect.filesToNotContainString(
          myAppLabels,
          '<fullName>force_app_Label_1</fullName>',
          '<fullName>force_app_Label_2</fullName>'
        );
      });

      it('should put individual label into default CustomLabels file when no labels exist locally', async () => {
        // Delete local labels to simulate having new labels created in the org
        await testkit.deleteGlobs([forceAppLabels, myAppLabels]);
        await testkit.retrieve({ args: '--metadata CustomLabel:force_app_Label_1' });

        await testkit.expect.filesToBeDeployed([forceAppLabels]);
        await testkit.expect.filesToContainString(forceAppLabels, '<fullName>force_app_Label_1</fullName>');
        await testkit.expect.filesToNotContainString(
          forceAppLabels,
          '<fullName>my_app_Label_1</fullName>',
          '<fullName>force_app_Label_2</fullName>'
        );
      });
    });

    describe('--metadata CustomLabel:force_app_Label_1,CustomLabel:my_app_Label_1', () => {
      it('should put labels into appropriate CustomLabels file', async () => {
        await testkit.modifyLocalGlobs([forceAppLabels, myAppLabels]);
        await testkit.retrieve({ args: '--metadata CustomLabel:force_app_Label_1,CustomLabel:my_app_Label_1' });

        await testkit.expect.filesToBeDeployed([forceAppLabels, myAppLabels]);
        await testkit.expect.filesToNotContainString(forceAppLabels, '<fullName>my_app_Label_1</fullName>');
        await testkit.expect.filesToNotContainString(
          myAppLabels,
          '<fullName>force_app_Label_1</fullName>',
          '<fullName>force_app_Label_2</fullName>'
        );
      });
    });

    describe('--sourcepath force-app', () => {
      it('should put labels into appropriate CustomLabels file', async () => {
        await testkit.modifyLocalGlobs([forceAppLabels]);
        await testkit.retrieve({ args: '--sourcepath force-app' });

        await testkit.expect.filesToBeDeployed([forceAppLabels]);
        await testkit.expect.filesToNotBeChanged([myAppLabels]);

        await testkit.expect.filesToNotContainString(forceAppLabels, '<fullName>my_app_Label_1</fullName>');
        await testkit.expect.filesToNotContainString(
          myAppLabels,
          '<fullName>force_app_Label_1</fullName>',
          '<fullName>force_app_Label_2</fullName>'
        );
      });
    });

    describe('--sourcepath my-app', () => {
      it('should put labels into appropriate CustomLabels file', async () => {
        await testkit.modifyLocalGlobs([myAppLabels]);
        await testkit.retrieve({ args: '--sourcepath my-app' });

        await testkit.expect.filesToBeDeployed([myAppLabels]);
        await testkit.expect.filesToNotBeChanged([forceAppLabels]);

        await testkit.expect.filesToNotContainString(forceAppLabels, '<fullName>my_app_Label_1</fullName>');
        await testkit.expect.filesToNotContainString(
          myAppLabels,
          '<fullName>force_app_Label_1</fullName>',
          '<fullName>force_app_Label_2</fullName>'
        );
      });
    });

    describe('--sourcepath force-app,my-app', () => {
      it('should put labels into appropriate CustomLabels file', async () => {
        await testkit.modifyLocalGlobs([forceAppLabels, myAppLabels]);
        await testkit.retrieve({ args: '--sourcepath force-app,my-app' });

        await testkit.expect.filesToBeDeployed([forceAppLabels, myAppLabels]);
        await testkit.expect.filesToNotContainString(forceAppLabels, '<fullName>my_app_Label_1</fullName>');
        await testkit.expect.filesToNotContainString(
          myAppLabels,
          '<fullName>force_app_Label_1</fullName>',
          '<fullName>force_app_Label_2</fullName>'
        );
      });
    });

    describe('--manifest (all labels)', () => {
      it('should put labels into appropriate CustomLabels file', async () => {
        await testkit.modifyLocalGlobs([forceAppLabels, myAppLabels]);
        const xml = '<types><members>CustomLabels</members><name>CustomLabels</name></types>';
        const packageXml = await testkit.createPackageXml(xml);
        await testkit.retrieve({ args: `--manifest ${packageXml}` });

        await testkit.expect.filesToBeDeployed([forceAppLabels, myAppLabels]);
        await testkit.expect.filesToNotContainString(forceAppLabels, '<fullName>my_app_Label_1</fullName>');
        await testkit.expect.filesToNotContainString(
          myAppLabels,
          '<fullName>force_app_Label_1</fullName>',
          '<fullName>force_app_Label_2</fullName>'
        );
      });
    });

    describe('--manifest (individual labels)', () => {
      it('should put labels into appropriate CustomLabels file', async () => {
        const xml = '<types><members>force_app_Label_1</members><name>CustomLabel</name></types>';
        const packageXml = await testkit.createPackageXml(xml);
        await testkit.retrieve({ args: `--manifest ${packageXml}` });
        await testkit.expect.filesToContainString(forceAppLabels, '<fullName>force_app_Label_1</fullName>');
        await testkit.expect.filesToNotContainString(forceAppLabels, '<fullName>my_app_Label_1</fullName>');
      });
    });
  });
});
