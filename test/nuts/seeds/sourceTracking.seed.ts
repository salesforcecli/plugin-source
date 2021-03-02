/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Nutcase } from '../nutcase';
import { RepoConfig } from '../testMatrix';

// DO NOT TOUCH. generateNuts.ts will insert these values
const REPO = { gitUrl: '' } as RepoConfig;
const EXECUTABLE = '';

context('Source Tracking NUTs %REPO% %EXEC%', () => {
  let nutcase: Nutcase;

  before(async () => {
    nutcase = await Nutcase.create({ repository: REPO.gitUrl, executable: EXECUTABLE });
  });

  after(async () => {
    await nutcase?.clean();
  });

  it('should show all files as Local Add', async () => {
    const status = await nutcase.status();
    nutcase.expect.statusJsonToBeValid(status.result);
    nutcase.expect.statusToOnlyHaveState(status.result, 'Local Add');
  });

  it('should push the entire project', async () => {
    const push = await nutcase.push();
    await nutcase.expect.allMetaXmlsToBePushed(push.result);
    nutcase.expect.pushJsonToBeValid(push.result);

    const status = await nutcase.status();
    nutcase.expect.statusJsonToBeValid(status.result);
    nutcase.expect.statusToBeEmpty(status.result);
  });

  it('should show Local Add when files have been added', async () => {
    await nutcase.addTestFiles();
    const status = await nutcase.status();
    nutcase.expect.statusJsonToBeValid(status.result);
    nutcase.expect.statusFilesToHaveState(status.result, 'Local Add', nutcase.testMetadataFiles);
  });

  it('should push the added files', async () => {
    const push = await nutcase.push();
    nutcase.expect.filesToBePushed(push.result, nutcase.testMetadataFiles);
    nutcase.expect.pushJsonToBeValid(push.result);

    const status = await nutcase.status();
    nutcase.expect.statusJsonToBeValid(status.result);
    nutcase.expect.statusToBeEmpty(status.result);
  });

  it('should have results in source status after local file change', async () => {
    await nutcase.modifyLocalFiles(nutcase.testMetadataFiles[0]);
    const status = await nutcase.status();
    nutcase.expect.statusJsonToBeValid(status.result);
    nutcase.expect.statusFileToHaveState(status.result, 'Local Changed', nutcase.testMetadataFiles[0]);
  });

  it('should push only changed files', async () => {
    const push = await nutcase.push();
    nutcase.expect.fileToBePushed(push.result, nutcase.testMetadataFiles[0]);
    nutcase.expect.pushJsonToBeValid(push.result);
  });

  it('should should show and pull remote changes', async () => {
    const quickAction = await nutcase.modifyRemoteFile();

    const statusPre = await nutcase.status();
    nutcase.expect.statusJsonToBeValid(statusPre.result);
    nutcase.expect.statusToOnlyHaveState(statusPre.result, 'Remote Changed');

    const pull = await nutcase.pull();
    nutcase.expect.fileToBeChanged(quickAction);
    nutcase.expect.pullJsonToBeValid(pull.result);
    nutcase.expect.fileToBePulled(pull.result, quickAction);

    const statusPost = await nutcase.status();
    nutcase.expect.statusJsonToBeValid(statusPost.result);
    nutcase.expect.statusToBeEmpty(statusPost.result);
  });

  it('should fail when conflicts are present', async () => {
    const quickAction = await nutcase.modifyRemoteFile();
    await nutcase.modifyLocalFiles(quickAction);
    const status = await nutcase.status();
    nutcase.expect.statusJsonToBeValid(status.result);
    nutcase.expect.statusToOnlyHaveConflicts(status.result);

    const push = await nutcase.push({ exitCode: 1 });
    nutcase.expect.errorToHaveName(push, 'sourceConflictDetected');

    const pull = await nutcase.pull({ exitCode: 1 });
    nutcase.expect.errorToHaveName(pull, 'sourceConflictDetected');
  });

  it('should push with --forceoverwrite when conflicts are present', async () => {
    const quickAction = await nutcase.modifyRemoteFile();
    await nutcase.modifyLocalFiles(quickAction);
    const status = await nutcase.status();
    nutcase.expect.statusJsonToBeValid(status.result);
    nutcase.expect.statusToOnlyHaveConflicts(status.result);

    const push = await nutcase.push({ args: '--forceoverwrite' });
    nutcase.expect.pushJsonToBeValid(push.result);
    nutcase.expect.fileToBePushed(push.result, quickAction);
  });

  it('should pull with --forceoverwrite when conflicts are present', async () => {
    const quickAction = await nutcase.modifyRemoteFile();
    await nutcase.modifyLocalFiles(quickAction);
    const status = await nutcase.status();
    nutcase.expect.statusJsonToBeValid(status.result);
    nutcase.expect.statusToOnlyHaveConflicts(status.result);

    const pull = await nutcase.pull({ args: '--forceoverwrite' });
    nutcase.expect.pullJsonToBeValid(pull.result);
    nutcase.expect.fileToBePulled(pull.result, quickAction);
  });

  it('should show all files as Remote Add when source tracking is cleared and source files are removed', async () => {
    await nutcase.deleteAllSourceFiles();
    await nutcase.deleteMaxRevision();
    await nutcase.deleteSourcePathInfos();

    const status = await nutcase.status();
    nutcase.expect.statusJsonToBeValid(status.result);
    nutcase.expect.statusToOnlyHaveState(status.result, 'Remote Add');
  });

  it('should pull the entire project', async () => {
    const pull = await nutcase.pull();
    await nutcase.expect.allMetaXmlsToBePulled(pull.result);
    nutcase.expect.pullJsonToBeValid(pull.result);

    const status = await nutcase.status();
    nutcase.expect.statusJsonToBeValid(status.result);
    nutcase.expect.statusToBeEmpty(status.result);
  });
});
