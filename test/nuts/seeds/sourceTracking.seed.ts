/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { SourceTestkit } from '@salesforce/source-testkit';
import { TEST_REPOS_MAP } from '../testMatrix';

// DO NOT TOUCH. generateNuts.ts will insert these values
const REPO = TEST_REPOS_MAP.get('%REPO_URL%');
const EXECUTABLE = '%EXECUTABLE%';

context.skip('Source Tracking NUTs [name: %REPO_NAME%] [exec: %EXECUTABLE%]', () => {
  let testkit: SourceTestkit;

  before(async () => {
    testkit = await SourceTestkit.create({
      repository: REPO.gitUrl,
      executable: EXECUTABLE,
      nut: __filename,
    });
  });

  after(async () => {
    await testkit?.clean();
  });

  it('should show all files as Local Add', async () => {
    const status = await testkit.status();
    testkit.expect.statusToOnlyHaveState(status.result, 'Local Add');
  });

  it('should push the entire project', async () => {
    await testkit.push();
    await testkit.expect.filesToBePushed(testkit.packageGlobs);

    const status = await testkit.status();
    testkit.expect.statusToBeEmpty(status.result);
  });

  it('should show Local Add when files have been added', async () => {
    await testkit.addTestFiles();
    const status = await testkit.status();
    testkit.expect.statusFilesToHaveState(status.result, 'Local Add', testkit.testMetadataFiles);
  });

  it('should push the added files', async () => {
    await testkit.push();
    await testkit.expect.filesToBePushed(testkit.testMetadataFiles);

    const status = await testkit.status();
    testkit.expect.statusToBeEmpty(status.result);
  });

  it('should have results in source status after local file change', async () => {
    await testkit.modifyLocalFile(testkit.testMetadataFiles[0]);
    const status = await testkit.status();
    testkit.expect.statusFileToHaveState(status.result, 'Local Changed', testkit.testMetadataFiles[0]);
  });

  it('should push only changed files', async () => {
    await testkit.push();
    await testkit.expect.filesToBePushed([testkit.testMetadataFiles[0]]);
  });

  it('should should show and pull remote changes', async () => {
    const quickAction = await testkit.modifyRemoteFile();

    const statusPre = await testkit.status();
    testkit.expect.statusToOnlyHaveState(statusPre.result, 'Remote Changed');

    await testkit.pull();
    testkit.expect.fileToBeChanged(quickAction);

    const statusPost = await testkit.status();
    testkit.expect.statusToBeEmpty(statusPost.result);
  });

  it('should fail when conflicts are present', async () => {
    const quickAction = await testkit.modifyRemoteFile();
    await testkit.modifyLocalFile(quickAction);
    const status = await testkit.status();
    testkit.expect.statusToOnlyHaveConflicts(status.result);

    const push = await testkit.push({ exitCode: 1 });
    testkit.expect.errorToHaveName(push, 'sourceConflictDetected');

    const pull = await testkit.pull({ exitCode: 1 });
    testkit.expect.errorToHaveName(pull, 'sourceConflictDetected');
  });

  it('should push with --forceoverwrite when conflicts are present', async () => {
    const quickAction = await testkit.modifyRemoteFile();
    await testkit.modifyLocalFile(quickAction);
    const status = await testkit.status();
    testkit.expect.statusToOnlyHaveConflicts(status.result);

    await testkit.push({ args: '--forceoverwrite' });
    await testkit.expect.filesToBePushed([quickAction]);
  });

  it('should pull with --forceoverwrite when conflicts are present', async () => {
    const quickAction = await testkit.modifyRemoteFile();
    await testkit.modifyLocalFile(quickAction);
    const status = await testkit.status();
    testkit.expect.statusToOnlyHaveConflicts(status.result);

    await testkit.pull({ args: '--forceoverwrite' });
    testkit.expect.fileToBeChanged(quickAction);
  });

  it('should show all files as Remote Add when source tracking is cleared and source files are removed', async () => {
    await testkit.deleteAllSourceFiles();
    await testkit.deleteMaxRevision();
    await testkit.deleteSourcePathInfos();

    const status = await testkit.status();
    testkit.expect.statusToOnlyHaveState(status.result, 'Remote Add');
  });

  it('should pull the entire project', async () => {
    await testkit.pull();
    // Only expect the first package to exist in this scenario since we deleted all the source files
    await testkit.expect.filesToExist([testkit.packageGlobs[0]]);
    const status = await testkit.status();
    testkit.expect.statusToBeEmpty(status.result);
  });
});
