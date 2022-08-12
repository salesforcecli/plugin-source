/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import * as fs from 'fs';
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
      await testkit.expect.filesToBeChanged(objectsAndFields);
      await testkit.expect.filesToNotExist([
        'force-app/main/default/objects/MyObj__c/fields/*',
        'my-app/objects/MyObj__c/MyObj__c.object.xml',
      ]);
    });
  });

  describe('CustomLabels', () => {
    // NOTE these are glob patterns so there's no need to use path.join here
    const forceAppLabels = 'force-app/main/default/labels/CustomLabels.labels-meta.xml';
    const myAppLabels = 'my-app/labels/CustomLabels.labels-meta.xml';

    let originalState: Dictionary<string>;

    const filesAreInOriginalState = async () =>
      Promise.all([
        testkit.expect.filesToContainString(myAppLabels, '<fullName>my_app_Label_1</fullName>'),
        testkit.expect.filesToNotContainString(forceAppLabels, '<fullName>my_app_Label_1</fullName>'),
        testkit.expect.filesToContainString(
          forceAppLabels,
          '<fullName>force_app_Label_1</fullName>',
          '<fullName>force_app_Label_2</fullName>'
        ),
        testkit.expect.filesToNotContainString(
          myAppLabels,
          '<fullName>force_app_Label_1</fullName>',
          '<fullName>force_app_Label_2</fullName>'
        ),
      ]);

    before(async () => {
      originalState = await testkit.readGlobs([forceAppLabels, myAppLabels]);
    });

    beforeEach(async () => {
      await Promise.all(
        Object.entries(originalState).map(([filename, contents]) => testkit.writeFile(filename, contents))
      );
      // for (const [filename, contents] of Object.entries(originalState)) {
      //   await testkit.writeFile(filename, contents);
      // }
    });

    describe('--metadata CustomLabels', () => {
      it('should put labels into appropriate CustomLabels file', async () => {
        await testkit.modifyLocalGlobs([forceAppLabels, myAppLabels]);
        await testkit.retrieve({ args: '--metadata CustomLabels' });

        await testkit.expect.filesToBeChanged([forceAppLabels, myAppLabels]);
        await filesAreInOriginalState();
      });

      it('should put new labels into CustomLabels file in default package', async () => {
        // Delete local labels to simulate having new labels created in the org
        await testkit.deleteGlobs([myAppLabels]);
        await testkit.retrieve({ args: '--metadata CustomLabels' });

        await testkit.expect.filesToBeChanged([forceAppLabels]);
        await testkit.expect.filesToContainString(
          forceAppLabels,
          '<fullName>my_app_Label_1</fullName>',
          '<fullName>force_app_Label_1</fullName>',
          '<fullName>force_app_Label_2</fullName>'
        );
      });

      it('should put new labels into default CustomLabels file', async () => {
        // Delete local labels to simulate having new labels created in the org
        await testkit.deleteGlobs([forceAppLabels]);
        await testkit.retrieve({ args: '--metadata CustomLabels' });

        await filesAreInOriginalState();
      });

      it('should put all labels into default CustomLabels file when no labels exist locally', async () => {
        // Delete local labels to simulate having new labels created in the org
        await testkit.deleteGlobs([forceAppLabels, myAppLabels]);
        await testkit.retrieve({ args: '--metadata CustomLabels' });

        await testkit.expect.filesToBeChanged([forceAppLabels]);
        await testkit.expect.filesToContainString(
          forceAppLabels,
          '<fullName>my_app_Label_1</fullName>',
          '<fullName>force_app_Label_1</fullName>',
          '<fullName>force_app_Label_2</fullName>'
        );
        await testkit.expect.filesToNotExist([myAppLabels]);
      });
    });

    describe('--metadata CustomLabel:force_app_Label_1', () => {
      it('should put individual label into appropriate CustomLabels file', async () => {
        await testkit.retrieve({ args: '--metadata CustomLabel:force_app_Label_1' });

        await testkit.expect.filesToNotBeChanged([myAppLabels]);
        await filesAreInOriginalState();
      });

      it('should put individual label into default CustomLabels file when no labels exist locally', async () => {
        // Delete local labels to simulate having new labels created in the org
        await testkit.deleteGlobs([forceAppLabels, myAppLabels]);
        await testkit.retrieve({ args: '--metadata CustomLabel:force_app_Label_1' });

        await testkit.expect.filesToBeChanged([forceAppLabels]);
        await testkit.expect.filesToContainString(forceAppLabels, '<fullName>force_app_Label_1</fullName>');
        await testkit.expect.filesToNotContainString(
          forceAppLabels,
          '<fullName>my_app_Label_1</fullName>',
          '<fullName>force_app_Label_2</fullName>'
        );
      });

      it('should put 1 new label into file and still have the OTHER label', async () => {
        // remove label2 and then retrieve it.  Make sure label
        const forceAppLabelFile = path.normalize(path.join(testkit.projectDir, forceAppLabels));
        await fs.promises.writeFile(
          forceAppLabelFile,
          (
            await fs.promises.readFile(forceAppLabelFile, 'utf-8')
          ).replace(/(<labels>\s*<fullName>force_app_Label_2.*<\/labels>)/gs, '')
        );
        await testkit.retrieve({ args: '--metadata CustomLabel:force_app_Label_2' });

        await filesAreInOriginalState();
      });
    });

    describe('--metadata CustomLabel:force_app_Label_1,CustomLabel:my_app_Label_1', () => {
      it('should put 2 single labels into 2 CustomLabels files', async () => {
        await testkit.modifyLocalGlobs([forceAppLabels, myAppLabels]);
        await testkit.retrieve({ args: '--metadata CustomLabel:force_app_Label_1,CustomLabel:my_app_Label_1' });

        await testkit.expect.filesToBeChanged([forceAppLabels, myAppLabels]);
        await filesAreInOriginalState();
      });
    });

    describe('--sourcepath force-app', () => {
      it('should put labels into appropriate CustomLabels file', async () => {
        await testkit.modifyLocalGlobs([forceAppLabels]);
        await testkit.retrieve({ args: '--sourcepath force-app' });

        await testkit.expect.filesToBeChanged([forceAppLabels]);
        await testkit.expect.filesToNotBeChanged([myAppLabels]);
        await filesAreInOriginalState();
      });
    });

    describe('--sourcepath my-app', () => {
      it('should put labels into appropriate CustomLabels file', async () => {
        await testkit.modifyLocalGlobs([myAppLabels]);
        await testkit.retrieve({ args: '--sourcepath my-app' });

        await testkit.expect.filesToBeChanged([myAppLabels]);
        await testkit.expect.filesToNotBeChanged([forceAppLabels]);
        await filesAreInOriginalState();
      });
    });

    describe('--sourcepath force-app,my-app', () => {
      it('should put labels into appropriate CustomLabels file', async () => {
        await testkit.modifyLocalGlobs([forceAppLabels, myAppLabels]);
        await testkit.retrieve({ args: '--sourcepath force-app,my-app' });

        await testkit.expect.filesToBeChanged([forceAppLabels, myAppLabels]);
        await filesAreInOriginalState();
      });
    });

    describe('--manifest (all labels)', () => {
      it('should put labels into appropriate CustomLabels file', async () => {
        await testkit.modifyLocalGlobs([forceAppLabels, myAppLabels]);
        const xml = '<types><members>CustomLabels</members><name>CustomLabels</name></types>';
        const packageXml = await testkit.createPackageXml(xml);
        await testkit.retrieve({ args: `--manifest ${packageXml}` });

        await testkit.expect.filesToBeChanged([forceAppLabels, myAppLabels]);
        await filesAreInOriginalState();
      });
    });

    describe('--manifest (individual labels)', () => {
      it('should put labels into appropriate CustomLabels file', async () => {
        const xml = '<types><members>force_app_Label_1</members><name>CustomLabel</name></types>';
        const packageXml = await testkit.createPackageXml(xml);
        await testkit.retrieve({ args: `--manifest ${packageXml}` });
        await filesAreInOriginalState();
      });
    });
  });
});
