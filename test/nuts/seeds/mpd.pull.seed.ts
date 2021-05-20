/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Nutshell } from '../nutshell';

// DO NOT TOUCH. generateNuts.ts will insert these values
const EXECUTABLE = '%EXECUTABLE%';

context.skip('MPD Retrieve NUTs [exec: %EXECUTABLE%]', () => {
  let nutshell: Nutshell;

  before(async () => {
    nutshell = await Nutshell.create({
      repository: 'https://github.com/salesforcecli/sample-project-multiple-packages.git',
      executable: EXECUTABLE,
      nut: __filename,
    });
    await nutshell.trackGlobs(nutshell.packageGlobs);
    await nutshell.deploy({ args: `--sourcepath ${nutshell.packageNames.join(',')}` });
  });

  after(async () => {
    await nutshell?.clean();
  });

  describe('CustomObjects', () => {
    it('should put CustomObjects and CustomFields into appropriate package directory', async () => {
      const objectsAndFields = ['force-app/main/default/objects/MyObj__c/*', 'my-app/objects/MyObj__c/fields/*'];
      await nutshell.spoofRemoteChange(objectsAndFields);
      await nutshell.pull();
      await nutshell.expect.filesToBeChanged(['force-app/main/default/objects/MyObj__c/MyObj__c.object-meta.xml']);
      await nutshell.expect.filesToNotExist([
        'force-app/main/default/objects/MyObj__c/fields/*',
        'my-app/objects/MyObj__c/MyObj__c.object.xml',
      ]);
    });
  });

  describe('CustomLabels', () => {
    it('should put labels into appropriate CustomLabels file', async () => {
      const forceAppLabels = 'force-app/main/default/labels/CustomLabels.labels-meta.xml';
      const myAppLabels = 'my-app/labels/CustomLabels.labels-meta.xml';
      await nutshell.spoofRemoteChange([forceAppLabels, myAppLabels]);

      const status1 = await nutshell.status();
      nutshell.expect.statusToOnlyHaveState(status1.result, 'Remote Changed');

      await nutshell.pull();

      const status2 = await nutshell.status();
      nutshell.expect.statusToBeEmpty(status2.result);

      await nutshell.expect.filesToNotContainString(forceAppLabels, '<fullName>my_app_Label_1</fullName>');
      await nutshell.expect.filesToNotContainString(
        myAppLabels,
        '<fullName>force_app_Label_1</fullName>',
        '<fullName>force_app_Label_2</fullName>'
      );
    });
  });
});
