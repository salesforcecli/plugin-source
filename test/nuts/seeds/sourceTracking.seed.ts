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

context.skip('Source Tracking NUTs %REPO% %EXEC%', () => {
  let nutButter: NutButter;

  before(async () => {
    nutButter = await NutButter.create({ repository: REPO.gitUrl, executable: EXECUTABLE });
  });

  after(async () => {
    await nutButter?.clean();
  });

  it('should show all files as Local Add', async () => {
    const status = await nutButter.status();
    nutButter.expect.statusJsonToBeValid(status.result);
    nutButter.expect.statusToOnlyHaveState(status.result, 'Local Add');
  });

  it('should push the entire project', async () => {
    const push = await nutButter.push();
    await nutButter.expect.allMetaXmlsToBePushed(push.result);
    nutButter.expect.pushJsonToBeValid(push.result);

    const status = await nutButter.status();
    nutButter.expect.statusJsonToBeValid(status.result);
    nutButter.expect.statusToBeEmpty(status.result);
  });

  it('should show Local Add when files have been added', async () => {
    await nutButter.addTestFiles();
    const status = await nutButter.status();
    nutButter.expect.statusJsonToBeValid(status.result);
    nutButter.expect.statusFilesToHaveState(status.result, 'Local Add', nutButter.testMetadataFiles);
  });

  it('should push the added files', async () => {
    const push = await nutButter.push();
    nutButter.expect.filesToBePushed(push.result, nutButter.testMetadataFiles);
    nutButter.expect.pushJsonToBeValid(push.result);

    const status = await nutButter.status();
    nutButter.expect.statusJsonToBeValid(status.result);
    nutButter.expect.statusToBeEmpty(status.result);
  });

  it('should have results in source status after local file change', async () => {
    await nutButter.modifyLocalFiles(nutButter.testMetadataFiles[0]);
    const status = await nutButter.status();
    nutButter.expect.statusJsonToBeValid(status.result);
    nutButter.expect.statusFileToHaveState(status.result, 'Local Changed', nutButter.testMetadataFiles[0]);
  });

  it('should push only changed files', async () => {
    const push = await nutButter.push();
    nutButter.expect.fileToBePushed(push.result, nutButter.testMetadataFiles[0]);
    nutButter.expect.pushJsonToBeValid(push.result);
  });

  it('should should show and pull remote changes', async () => {
    const quickAction = await nutButter.modifyRemoteFile();

    const statusPre = await nutButter.status();
    nutButter.expect.statusJsonToBeValid(statusPre.result);
    nutButter.expect.statusToOnlyHaveState(statusPre.result, 'Remote Changed');

    const pull = await nutButter.pull();
    nutButter.expect.fileToBeChanged(quickAction);
    nutButter.expect.pullJsonToBeValid(pull.result);
    nutButter.expect.fileToBePulled(pull.result, quickAction);

    const statusPost = await nutButter.status();
    nutButter.expect.statusJsonToBeValid(statusPost.result);
    nutButter.expect.statusToBeEmpty(statusPost.result);
  });

  it('should fail when conflicts are present', async () => {
    const quickAction = await nutButter.modifyRemoteFile();
    await nutButter.modifyLocalFiles(quickAction);
    const status = await nutButter.status();
    nutButter.expect.statusJsonToBeValid(status.result);
    nutButter.expect.statusToOnlyHaveConflicts(status.result);

    const push = await nutButter.push({ exitCode: 1 });
    nutButter.expect.errorToHaveName(push, 'sourceConflictDetected');

    const pull = await nutButter.pull({ exitCode: 1 });
    nutButter.expect.errorToHaveName(pull, 'sourceConflictDetected');
  });

  it('should push with --forceoverwrite when conflicts are present', async () => {
    const quickAction = await nutButter.modifyRemoteFile();
    await nutButter.modifyLocalFiles(quickAction);
    const status = await nutButter.status();
    nutButter.expect.statusJsonToBeValid(status.result);
    nutButter.expect.statusToOnlyHaveConflicts(status.result);

    const push = await nutButter.push({ args: '--forceoverwrite' });
    nutButter.expect.pushJsonToBeValid(push.result);
    nutButter.expect.fileToBePushed(push.result, quickAction);
  });

  it('should pull with --forceoverwrite when conflicts are present', async () => {
    const quickAction = await nutButter.modifyRemoteFile();
    await nutButter.modifyLocalFiles(quickAction);
    const status = await nutButter.status();
    nutButter.expect.statusJsonToBeValid(status.result);
    nutButter.expect.statusToOnlyHaveConflicts(status.result);

    const pull = await nutButter.pull({ args: '--forceoverwrite' });
    nutButter.expect.pullJsonToBeValid(pull.result);
    nutButter.expect.fileToBePulled(pull.result, quickAction);
  });

  it('should show all files as Remote Add when source tracking is cleared and source files are removed', async () => {
    await nutButter.deleteAllSourceFiles();
    await nutButter.deleteMaxRevision();
    await nutButter.deleteSourcePathInfos();

    const status = await nutButter.status();
    nutButter.expect.statusJsonToBeValid(status.result);
    nutButter.expect.statusToOnlyHaveState(status.result, 'Remote Add');
  });

  it('should pull the entire project', async () => {
    const pull = await nutButter.pull();
    await nutButter.expect.allMetaXmlsToBePulled(pull.result);
    nutButter.expect.pullJsonToBeValid(pull.result);

    const status = await nutButter.status();
    nutButter.expect.statusJsonToBeValid(status.result);
    nutButter.expect.statusToBeEmpty(status.result);
  });
});
