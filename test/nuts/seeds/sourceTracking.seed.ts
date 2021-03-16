/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Nutshell } from '../nutshell';
import { TEST_REPOS_MAP } from '../testMatrix';

// DO NOT TOUCH. generateNuts.ts will insert these values
const REPO = TEST_REPOS_MAP.get('%REPO_URL%');
const EXECUTABLE = '%EXECUTABLE%';

context('Source Tracking NUTs [name: %REPO_NAME%] [exec: %EXECUTABLE%]', () => {
  let nutshell: Nutshell;

  before(async () => {
    nutshell = await Nutshell.create({
      repository: REPO.gitUrl,
      executable: EXECUTABLE,
      nut: __filename,
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
    await nutshell.push();
    await nutshell.expect.filesToBePushed(nutshell.packageGlobs);

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
    await nutshell.push();
    await nutshell.expect.filesToBePushed(nutshell.testMetadataFiles);

    const status = await nutshell.status();
    nutshell.expect.statusJsonToBeValid(status.result);
    nutshell.expect.statusToBeEmpty(status.result);
  });

  it('should have results in source status after local file change', async () => {
    await nutshell.modifyLocalFile(nutshell.testMetadataFiles[0]);
    const status = await nutshell.status();
    nutshell.expect.statusJsonToBeValid(status.result);
    nutshell.expect.statusFileToHaveState(status.result, 'Local Changed', nutshell.testMetadataFiles[0]);
  });

  it('should push only changed files', async () => {
    await nutshell.push();
    await nutshell.expect.fileToBePushed(nutshell.testMetadataFiles[0]);
  });

  it('should should show and pull remote changes', async () => {
    const quickAction = await nutshell.modifyRemoteFile();

    const statusPre = await nutshell.status();
    nutshell.expect.statusJsonToBeValid(statusPre.result);
    nutshell.expect.statusToOnlyHaveState(statusPre.result, 'Remote Changed');

    await nutshell.pull();
    nutshell.expect.fileToBeChanged(quickAction);

    const statusPost = await nutshell.status();
    nutshell.expect.statusJsonToBeValid(statusPost.result);
    nutshell.expect.statusToBeEmpty(statusPost.result);
  });

  it('should fail when conflicts are present', async () => {
    const quickAction = await nutshell.modifyRemoteFile();
    await nutshell.modifyLocalFile(quickAction);
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
    await nutshell.modifyLocalFile(quickAction);
    const status = await nutshell.status();
    nutshell.expect.statusJsonToBeValid(status.result);
    nutshell.expect.statusToOnlyHaveConflicts(status.result);

    await nutshell.push({ args: '--forceoverwrite' });
    await nutshell.expect.fileToBePushed(quickAction);
  });

  it('should pull with --forceoverwrite when conflicts are present', async () => {
    const quickAction = await nutshell.modifyRemoteFile();
    await nutshell.modifyLocalFile(quickAction);
    const status = await nutshell.status();
    nutshell.expect.statusJsonToBeValid(status.result);
    nutshell.expect.statusToOnlyHaveConflicts(status.result);

    await nutshell.pull({ args: '--forceoverwrite' });
    nutshell.expect.fileToBeChanged(quickAction);
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
    await nutshell.pull();
    // Only expect the first package to exist in this scenario since we deleted all the source files
    await nutshell.expect.filesToExist([nutshell.packageGlobs[0]]);
    const status = await nutshell.status();
    nutshell.expect.statusJsonToBeValid(status.result);
    nutshell.expect.statusToBeEmpty(status.result);
  });
});
