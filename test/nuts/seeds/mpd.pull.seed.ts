/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { SourceTestkit } from '@salesforce/source-testkit';

// DO NOT TOUCH. generateNuts.ts will insert these values
const EXECUTABLE = '%EXECUTABLE%';

context.skip('MPD Retrieve NUTs [exec: %EXECUTABLE%]', () => {
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
      await testkit.spoofRemoteChange(objectsAndFields);
      await testkit.pull();
      await testkit.expect.filesToBeChanged(['force-app/main/default/objects/MyObj__c/MyObj__c.object-meta.xml']);
      await testkit.expect.filesToNotExist([
        'force-app/main/default/objects/MyObj__c/fields/*',
        'my-app/objects/MyObj__c/MyObj__c.object.xml',
      ]);
    });
  });

  describe('CustomLabels', () => {
    it('should put labels into appropriate CustomLabels file', async () => {
      const forceAppLabels = 'force-app/main/default/labels/CustomLabels.labels-meta.xml';
      const myAppLabels = 'my-app/labels/CustomLabels.labels-meta.xml';
      await testkit.spoofRemoteChange([forceAppLabels, myAppLabels]);

      const status1 = await testkit.status();
      testkit.expect.statusToOnlyHaveState(status1.result, 'Remote Changed');

      await testkit.pull();

      const status2 = await testkit.status();
      testkit.expect.statusToBeEmpty(status2.result);

      await testkit.expect.filesToNotContainString(forceAppLabels, '<fullName>my_app_Label_1</fullName>');
      await testkit.expect.filesToNotContainString(
        myAppLabels,
        '<fullName>force_app_Label_1</fullName>',
        '<fullName>force_app_Label_2</fullName>'
      );
    });
  });
});
