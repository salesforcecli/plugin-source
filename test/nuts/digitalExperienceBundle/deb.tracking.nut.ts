/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import fs from 'node:fs';
import { join } from 'node:path';
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { expect } from 'chai';
import { DeleteTrackingResult } from '@salesforce/plugin-deploy-retrieve/lib/commands/project/delete/tracking.js';
import { PushResponse } from '../../../src/formatters/source/pushResultFormatter.js';
import { StatusResult } from '../../../src/formatters/source/statusFormatter.js';
import { PullResponse } from '../../../src/formatters/source/pullFormatter.js';
import { FILE_RELATIVE_PATHS, TEST_SESSION_OPTIONS, TYPES } from './constants.js';
import {
  assertAllDEBAndTheirDECounts,
  assertDEBMeta,
  assertDocumentDetailPageA,
  assertDocumentDetailPageADelete,
  assertNoLocalChanges,
  assertViewHome,
  assertViewHomeStatus,
  createDocumentDetailPageAInLocal,
  deleteDocumentDetailPageAInLocal,
  deleteViewHomeFRVariantInLocal,
} from './helper.js';

describe('deb -- tracking/push/pull', () => {
  let session: TestSession;

  before(async () => {
    session = await TestSession.create(TEST_SESSION_OPTIONS);
  });

  after(async () => {
    await session?.clean();
  });

  describe('push', () => {
    it('should push the whole project', () => {
      const pushedSource = execCmd<PushResponse>('force:source:push --json', {
        ensureExitCode: 0,
      }).jsonOutput.result.pushedSource;

      assertAllDEBAndTheirDECounts(pushedSource, 10);
    });

    it('should see local change in deb_b', async () => {
      const debMetaFilePathB = join(session.project.dir, FILE_RELATIVE_PATHS.DEB_META_B);
      const original = await fs.promises.readFile(debMetaFilePathB, 'utf8');
      await fs.promises.writeFile(debMetaFilePathB, original.replace('meta space b', 'meta space b updated'));

      const statusResult = execCmd<StatusResult[]>('force:source:status --local --json', {
        ensureExitCode: 0,
      }).jsonOutput.result;

      assertDEBMeta(statusResult, 'B');
    });

    it('should push local change in deb_b', () => {
      const pushedSource = execCmd<PushResponse>('force:source:push --json', {
        ensureExitCode: 0,
      }).jsonOutput.result.pushedSource;

      assertDEBMeta(pushedSource, 'B');
      assertNoLocalChanges();
    });

    it('should see local change in de_view_home_content of deb_b', async () => {
      const deViewHomeContentFilePathB = join(session.project.dir, FILE_RELATIVE_PATHS.DE_VIEW_HOME_CONTENT_B);
      const original = await fs.promises.readFile(deViewHomeContentFilePathB, 'utf8');
      await fs.promises.writeFile(
        deViewHomeContentFilePathB,
        original.replace('Start Building Your Page', 'Start Building Your Page Updated')
      );

      const statusResult = execCmd<StatusResult[]>('force:source:status --local --json', {
        ensureExitCode: 0,
      }).jsonOutput.result;

      assertViewHomeStatus(statusResult, 'B', 'CONTENT');
    });

    it('should push local change in de_view_home_content of deb_b', () => {
      const pushedSource = execCmd<PushResponse>('force:source:push --json', {
        ensureExitCode: 0,
      }).jsonOutput.result.pushedSource;

      assertViewHome(pushedSource, 'B');
      assertNoLocalChanges();
    });

    it('should see local change in de_view_home_meta of deb_b', async () => {
      const deViewHomeMetaFilePathB = join(session.project.dir, FILE_RELATIVE_PATHS.DE_VIEW_HOME_META_B);
      await fs.promises.writeFile(
        deViewHomeMetaFilePathB,
        '{"apiName" : "home", "path" : "views", "type" : "sfdc_cms__view"}'
      );

      const statusResult = execCmd<StatusResult[]>('force:source:status --local --json', {
        ensureExitCode: 0,
      }).jsonOutput.result;

      assertViewHomeStatus(statusResult, 'B', 'META');
    });

    it('should push local change in de_view_home_meta of deb_b', () => {
      const pushedSource = execCmd<PushResponse>('force:source:push --json', {
        ensureExitCode: 0,
      }).jsonOutput.result.pushedSource;

      assertViewHome(pushedSource, 'B');
      assertNoLocalChanges();
    });
  });

  describe('pull', () => {
    it('should pull all debs after clearing source tracking info', () => {
      execCmd<DeleteTrackingResult>('force:source:tracking:clear --noprompt', {
        ensureExitCode: 0,
      });

      const pulledSource = execCmd<PullResponse>('force:source:pull --forceoverwrite --json', {
        ensureExitCode: 0,
      }).jsonOutput.result.pulledSource;

      assertAllDEBAndTheirDECounts(pulledSource, 0, false);
    });

    it('should not see any local/remote changes in deb/de', () => {
      const statusResult = execCmd<StatusResult[]>('force:source:status --json', {
        ensureExitCode: 0,
      }).jsonOutput.result;

      expect(statusResult.every((s) => s.type !== TYPES.DE?.name && s.type !== TYPES.DEB.name)).to.be.true;
    });
  });

  describe.skip('delete', () => {
    it('should see locally deleted de_view_home fr language variant of deb_b', async () => {
      await deleteViewHomeFRVariantInLocal('B', session.project.dir);

      const statusResult = execCmd<StatusResult[]>('force:source:status --local --json', {
        ensureExitCode: 0,
      }).jsonOutput.result;

      assertViewHomeStatus(statusResult, 'B', 'FR_VARIANT');
    });

    it('should push locally deleted de_view_home fr language variant of deb_b', () => {
      // Bug
    });
  });

  describe('new site page', () => {
    it('should see locally added page (view and route de components) in deb_a', () => {
      createDocumentDetailPageAInLocal(session.project.dir);

      const statusResult = execCmd<StatusResult[]>('force:source:status --local  --json', {
        ensureExitCode: 0,
      }).jsonOutput.result;

      assertDocumentDetailPageA(statusResult);
    });

    it('should push locally added page (view and route de components) in deb_a', () => {
      const pushedSource = execCmd<PushResponse>('force:source:push --json', {
        ensureExitCode: 0,
      }).jsonOutput.result.pushedSource;

      assertDocumentDetailPageA(pushedSource);
      assertNoLocalChanges();
    });

    it('should see locally deleted page (view and route de components) in deb_a', async () => {
      await deleteDocumentDetailPageAInLocal(session.project.dir);

      const statusResult = execCmd<StatusResult[]>('force:source:status --local --json', {
        ensureExitCode: 0,
      }).jsonOutput.result;

      assertDocumentDetailPageA(statusResult);
    });

    it('should push local delete change in deb_a [locally deleted page (view and route de components)]', async () => {
      const pushedSource = execCmd<PushResponse>('force:source:push --json', {
        ensureExitCode: 0,
      }).jsonOutput.result.pushedSource;

      assertDocumentDetailPageA(pushedSource);
      assertNoLocalChanges();

      await assertDocumentDetailPageADelete(session, false);
    });
  });
});
