/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Nutshell } from '../nutshell';
import { RepoConfig } from '../testMatrix';

// DO NOT TOUCH. generateNuts.ts will insert these values
const REPO = { gitUrl: '' } as RepoConfig;
const EXECUTABLE = '';

context('Source Tracking NUTs %REPO% %EXEC%', () => {
  let nutshell: Nutshell;

  before(async () => {
    nutshell = await Nutshell.create({
      repository: REPO.gitUrl,
      executable: EXECUTABLE,
      context: __filename,
    });
  });

  after(async () => {
    await nutshell?.clean();
  });

  it('should show all files as Local Add', async () => {
    const status = await nutshell.status();
    nutshell.expect.statusJsonToBeValid(status.result);
    nutshell.expect.statusToOnlyHaveState(status.result, 'Local Add');
  });

  it('should push the entire project', async () => {
    const push = await nutshell.push();
    await nutshell.expect.allMetaXmlsToBePushed(push.result);
    nutshell.expect.pushJsonToBeValid(push.result);

    const status = await nutshell.status();
    nutshell.expect.statusJsonToBeValid(status.result);
    nutshell.expect.statusToBeEmpty(status.result);
  });

  it('should show Local Add when files have been added', async () => {
    await nutshell.addTestFiles();
    const status = await nutshell.status();
    nutshell.expect.statusJsonToBeValid(status.result);
    nutshell.expect.statusFilesToHaveState(status.result, 'Local Add', nutshell.testMetadataFiles);
  });

  it('should push the added files', async () => {
    const push = await nutshell.push();
    nutshell.expect.filesToBePushed(push.result, nutshell.testMetadataFiles);
    nutshell.expect.pushJsonToBeValid(push.result);

    const status = await nutshell.status();
    nutshell.expect.statusJsonToBeValid(status.result);
    nutshell.expect.statusToBeEmpty(status.result);
  });

  it('should have results in source status after local file change', async () => {
    await nutshell.modifyLocalFiles(nutshell.testMetadataFiles[0]);
    const status = await nutshell.status();
    nutshell.expect.statusJsonToBeValid(status.result);
    nutshell.expect.statusFileToHaveState(status.result, 'Local Changed', nutshell.testMetadataFiles[0]);
  });

  it('should push only changed files', async () => {
    const push = await nutshell.push();
    nutshell.expect.fileToBePushed(push.result, nutshell.testMetadataFiles[0]);
    nutshell.expect.pushJsonToBeValid(push.result);
  });

  it('should should show and pull remote changes', async () => {
    const quickAction = await nutshell.modifyRemoteFile();

    const statusPre = await nutshell.status();
    nutshell.expect.statusJsonToBeValid(statusPre.result);
    nutshell.expect.statusToOnlyHaveState(statusPre.result, 'Remote Changed');

    const pull = await nutshell.pull();
    nutshell.expect.fileToBeChanged(quickAction);
    nutshell.expect.pullJsonToBeValid(pull.result);
    nutshell.expect.fileToBePulled(pull.result, quickAction);

    const statusPost = await nutshell.status();
    nutshell.expect.statusJsonToBeValid(statusPost.result);
    nutshell.expect.statusToBeEmpty(statusPost.result);
  });

  it('should fail when conflicts are present', async () => {
    const quickAction = await nutshell.modifyRemoteFile();
    await nutshell.modifyLocalFiles(quickAction);
    const status = await nutshell.status();
    nutshell.expect.statusJsonToBeValid(status.result);
    nutshell.expect.statusToOnlyHaveConflicts(status.result);

    const push = await nutshell.push({ exitCode: 1 });
    nutshell.expect.errorToHaveName(push, 'sourceConflictDetected');

    const pull = await nutshell.pull({ exitCode: 1 });
    nutshell.expect.errorToHaveName(pull, 'sourceConflictDetected');
  });

  it('should push with --forceoverwrite when conflicts are present', async () => {
    const quickAction = await nutshell.modifyRemoteFile();
    await nutshell.modifyLocalFiles(quickAction);
    const status = await nutshell.status();
    nutshell.expect.statusJsonToBeValid(status.result);
    nutshell.expect.statusToOnlyHaveConflicts(status.result);

    const push = await nutshell.push({ args: '--forceoverwrite' });
    nutshell.expect.pushJsonToBeValid(push.result);
    nutshell.expect.fileToBePushed(push.result, quickAction);
  });

  it('should pull with --forceoverwrite when conflicts are present', async () => {
    const quickAction = await nutshell.modifyRemoteFile();
    await nutshell.modifyLocalFiles(quickAction);
    const status = await nutshell.status();
    nutshell.expect.statusJsonToBeValid(status.result);
    nutshell.expect.statusToOnlyHaveConflicts(status.result);

    const pull = await nutshell.pull({ args: '--forceoverwrite' });
    nutshell.expect.pullJsonToBeValid(pull.result);
    nutshell.expect.fileToBePulled(pull.result, quickAction);
  });

  it('should show all files as Remote Add when source tracking is cleared and source files are removed', async () => {
    await nutshell.deleteAllSourceFiles();
    await nutshell.deleteMaxRevision();
    await nutshell.deleteSourcePathInfos();

    const status = await nutshell.status();
    nutshell.expect.statusJsonToBeValid(status.result);
    nutshell.expect.statusToOnlyHaveState(status.result, 'Remote Add');
  });

  it('should pull the entire project', async () => {
    const pull = await nutshell.pull();
    await nutshell.expect.allMetaXmlsToBePulled(pull.result);
    nutshell.expect.pullJsonToBeValid(pull.result);

    const status = await nutshell.status();
    nutshell.expect.statusJsonToBeValid(status.result);
    nutshell.expect.statusToBeEmpty(status.result);
  });
});
