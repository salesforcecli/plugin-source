/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { beforeEach } from 'mocha';
import { DeployCommandResult } from '../../../lib/formatters/deployResultFormatter';
import { RetrieveCommandResult } from '../../../lib/formatters/retrieveResultFormatter';
import { DEBS_RELATIVE_PATH, FULL_NAMES, METADATA, TEST_SESSION_OPTIONS, TYPES } from './constants';
import {
  assertAllDEBAndTheirDECounts,
  assertDECountOfSingleDEB,
  assertDECountsOfAllDEB,
  assertDocumentDetailPageA,
  assertDocumentDetailPageADelete,
  assertSingleDEBAndItsDECounts,
  assertViewHome,
  createDocumentDetailPageAInLocal,
  deleteLocalSource,
} from './helper';

describe('deb -- metadata option', () => {
  let session: TestSession;

  before(async () => {
    session = await TestSession.create(TEST_SESSION_OPTIONS);
  });

  after(async () => {
    await session?.clean();
  });

  describe('deploy', () => {
    before(() => {
      execCmd<DeployCommandResult>(
        `force:source:deploy --metadata ${TYPES.APEX_PAGE.name},${TYPES.APEX_CLASS.name} --json`,
        {
          ensureExitCode: 0,
        }
      );
    });

    it('should deploy complete enhanced lwr sites deb_a and deb_b (including de config, network and customsite)', () => {
      const deployedSource = execCmd<DeployCommandResult>(
        `force:source:deploy --metadata ${METADATA.FULL_SITE_DEB_A_AND_B} --json`,
        {
          ensureExitCode: 0,
        }
      ).jsonOutput.result.deployedSource;

      assertAllDEBAndTheirDECounts(deployedSource, 6);
    });

    describe('individual metadata type', () => {
      it('should deploy deb type (all debs - deb_a and deb_b)', () => {
        const deployedSource = execCmd<DeployCommandResult>(
          `force:source:deploy --metadata ${METADATA.ALL_DEBS} --json`,
          {
            ensureExitCode: 0,
          }
        ).jsonOutput.result.deployedSource;

        assertAllDEBAndTheirDECounts(deployedSource);
      });

      it('should deploy de type (all de components of deb_a and deb_b)', () => {
        const deployedSource = execCmd<DeployCommandResult>(
          `force:source:deploy --metadata ${METADATA.ALL_DE} --json`,
          {
            ensureExitCode: 0,
          }
        ).jsonOutput.result.deployedSource;

        assertDECountsOfAllDEB(deployedSource);
      });
    });

    describe('individual metadata item', () => {
      it('should deploy all de components of deb_b', () => {
        const deployedSource = execCmd<DeployCommandResult>(
          `force:source:deploy --metadata ${METADATA.ALL_DE_OF_DEB_B} --json`,
          {
            ensureExitCode: 0,
          }
        ).jsonOutput.result.deployedSource;

        assertDECountOfSingleDEB(deployedSource);
      });

      it('should deploy just deb_b', () => {
        const deployedSource = execCmd<DeployCommandResult>(
          `force:source:deploy --metadata ${METADATA.JUST_DEB_B} --json`,
          {
            ensureExitCode: 0,
          }
        ).jsonOutput.result.deployedSource;

        assertSingleDEBAndItsDECounts(deployedSource, FULL_NAMES.DEB_B);
      });

      it('should deploy de_view_home of deb_b', () => {
        const deployedSource = execCmd<DeployCommandResult>(
          `force:source:deploy --metadata ${METADATA.DE_VIEW_HOME_OF_DEB_B} --json`,
          {
            ensureExitCode: 0,
          }
        ).jsonOutput.result.deployedSource;

        assertViewHome(deployedSource, 'b');
      });
    });
  });

  describe('retrieve (without local metadata)', () => {
    beforeEach(async () => {
      await deleteLocalSource(DEBS_RELATIVE_PATH, session.project.dir);
    });

    describe('individual metadata type', () => {
      it('should retrieve deb type (all debs - deb_a and deb_b)', async () => {
        const inboundFiles = execCmd<RetrieveCommandResult>(
          `force:source:retrieve --metadata ${METADATA.ALL_DEBS} --json`,
          {
            ensureExitCode: 0,
          }
        ).jsonOutput.result.inboundFiles;

        assertAllDEBAndTheirDECounts(inboundFiles);
      });

      it('should retrieve de type (all de components of deb_a and deb_b)', () => {
        const inboundFiles = execCmd<RetrieveCommandResult>(
          `force:source:retrieve --metadata ${METADATA.ALL_DE} --json`,
          {
            ensureExitCode: 0,
          }
        ).jsonOutput.result.inboundFiles;

        assertDECountsOfAllDEB(inboundFiles);
      });
    });

    describe('individual metadata item', () => {
      it('should retrieve all de components of deb_b', () => {
        const inboundFiles = execCmd<RetrieveCommandResult>(
          `force:source:retrieve --metadata ${METADATA.ALL_DE_OF_DEB_B} --json`,
          {
            ensureExitCode: 0,
          }
        ).jsonOutput.result.inboundFiles;

        assertDECountOfSingleDEB(inboundFiles);
      });

      it('should retrieve just deb_b', () => {
        const inboundFiles = execCmd<RetrieveCommandResult>(
          `force:source:retrieve --metadata ${METADATA.JUST_DEB_B} --json`,
          {
            ensureExitCode: 0,
          }
        ).jsonOutput.result.inboundFiles;

        assertSingleDEBAndItsDECounts(inboundFiles, FULL_NAMES.DEB_B);
      });

      it('should retrieve de_view_home of deb_b', () => {
        const inboundFiles = execCmd<RetrieveCommandResult>(
          `force:source:retrieve --metadata ${METADATA.DE_VIEW_HOME_OF_DEB_B} --json`,
          {
            ensureExitCode: 0,
          }
        ).jsonOutput.result.inboundFiles;

        assertViewHome(inboundFiles, 'b');
      });
    });
  });

  describe('new site page', () => {
    it('should deploy new page (view and route de components) of deb_a', async () => {
      createDocumentDetailPageAInLocal(session.project.dir);

      const deployedSource = execCmd<DeployCommandResult>(
        `force:source:deploy --metadata ${METADATA.DE_DOCUMENT_DETAIL_PAGE_A} --json`,
        {
          ensureExitCode: 0,
        }
      ).jsonOutput.result.deployedSource;

      assertDocumentDetailPageA(deployedSource);
    });

    it('should delete the page (view and route de components) of deb_a', async () => {
      const deletedSource = execCmd<DeployCommandResult>(
        `force:source:delete --metadata ${METADATA.DE_DOCUMENT_DETAIL_PAGE_A} --noprompt --json`,
        {
          ensureExitCode: 0,
        }
      ).jsonOutput.result.deletedSource;

      assertDocumentDetailPageA(deletedSource);
      await assertDocumentDetailPageADelete(session, true);
    });
  });
});
