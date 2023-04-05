/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { DeployCommandResult } from '../../../lib/formatters/deployResultFormatter';
import { RetrieveCommandResult } from '../../../lib/formatters/retrieveResultFormatter';
import {
  DEB_A_RELATIVE_PATH,
  DEBS_RELATIVE_PATH,
  DIR_RELATIVE_PATHS,
  FULL_NAMES,
  TEST_SESSION_OPTIONS,
  TYPES,
} from './constants';
import {
  assertAllDEBAndTheirDECounts,
  assertDocumentDetailPageA,
  assertDocumentDetailPageADelete,
  assertSingleDEBAndItsDECounts,
  assertViewHome,
  assertViewHomeFRVariantDelete,
  createDocumentDetailPageAInLocal,
  deleteViewHomeFRVariantInLocal,
} from './helper';

describe('deb -- sourcepath option', () => {
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
        `force:source:deploy --sourcepath ${DEBS_RELATIVE_PATH},${DIR_RELATIVE_PATHS.DIGITAL_EXPERIENCE_CONFIGS},${DIR_RELATIVE_PATHS.NETWORKS},${DIR_RELATIVE_PATHS.SITES} --json`,
        {
          ensureExitCode: 0,
        }
      ).jsonOutput.result.deployedSource;

      assertAllDEBAndTheirDECounts(deployedSource, 6);
    });

    describe('individual metadata type', () => {
      it('should deploy deb type (all debs - deb_a and deb_b)', () => {
        const deployedSource = execCmd<DeployCommandResult>(
          `force:source:deploy --sourcepath ${DEBS_RELATIVE_PATH} --json`,
          {
            ensureExitCode: 0,
          }
        ).jsonOutput.result.deployedSource;

        assertAllDEBAndTheirDECounts(deployedSource);
      });
    });

    describe('individual metadata item', () => {
      it('should deploy just deb_a', () => {
        const deployedSource = execCmd<DeployCommandResult>(
          `force:source:deploy --sourcepath ${DEB_A_RELATIVE_PATH} --json`,
          {
            ensureExitCode: 0,
          }
        ).jsonOutput.result.deployedSource;

        assertSingleDEBAndItsDECounts(deployedSource, FULL_NAMES.DEB_A);
      });

      it('should deploy de_view_home of deb_a', () => {
        const deployedSource = execCmd<DeployCommandResult>(
          `force:source:deploy --sourcepath ${DIR_RELATIVE_PATHS.DE_VIEW_HOME_A} --json`,
          {
            ensureExitCode: 0,
          }
        ).jsonOutput.result.deployedSource;

        assertViewHome(deployedSource, 'A');
      });
    });
  });

  describe('retrieve', () => {
    describe('individual metadata type', () => {
      it('should retrieve deb type (all debs - deb_a and deb_b)', () => {
        const inboundFiles = execCmd<RetrieveCommandResult>(
          `force:source:retrieve --sourcepath ${DEBS_RELATIVE_PATH} --json`,
          {
            ensureExitCode: 0,
          }
        ).jsonOutput.result.inboundFiles;

        assertAllDEBAndTheirDECounts(inboundFiles);
      });
    });

    describe('individual metadata item', () => {
      it('should retrieve just deb_a', () => {
        const inboundFiles = execCmd<RetrieveCommandResult>(
          `force:source:retrieve --sourcepath ${DEB_A_RELATIVE_PATH} --json`,
          {
            ensureExitCode: 0,
          }
        ).jsonOutput.result.inboundFiles;

        assertSingleDEBAndItsDECounts(inboundFiles, FULL_NAMES.DEB_A);
      });

      it('should retrieve de_view_home of deb_a', () => {
        const inboundFiles = execCmd<RetrieveCommandResult>(
          `force:source:retrieve --sourcepath ${DIR_RELATIVE_PATHS.DE_VIEW_HOME_A} --json`,
          {
            ensureExitCode: 0,
          }
        ).jsonOutput.result.inboundFiles;

        assertViewHome(inboundFiles, 'A');
      });
    });
  });

  describe('delete', () => {
    it('should delete de_view_home fr language variant of deb_a', async () => {
      await deleteViewHomeFRVariantInLocal('A', session.project.dir);

      const deployedSource = execCmd<DeployCommandResult>(
        `force:source:deploy --sourcepath ${DIR_RELATIVE_PATHS.DE_VIEW_HOME_A} --json`,
        {
          ensureExitCode: 0,
        }
      ).jsonOutput.result.deployedSource;

      assertViewHomeFRVariantDelete(deployedSource, 'A', session.project.dir);
    });
  });

  describe('new site page', () => {
    it('should deploy new page (view and route de components) of deb_a', () => {
      createDocumentDetailPageAInLocal(session.project.dir);

      const deployedSource = execCmd<DeployCommandResult>(
        `force:source:deploy --sourcepath ${DIR_RELATIVE_PATHS.DE_VIEW_DOCUMENT_DETAIL_A},${DIR_RELATIVE_PATHS.DE_ROUTE_DOCUMENT_DETAIL_A} --json`,
        {
          ensureExitCode: 0,
        }
      ).jsonOutput.result.deployedSource;

      assertDocumentDetailPageA(deployedSource);
    });

    it('should delete the page (view and route de components) of deb_a', async () => {
      const deletedSource = execCmd<DeployCommandResult>(
        `force:source:delete --sourcepath ${DIR_RELATIVE_PATHS.DE_VIEW_DOCUMENT_DETAIL_A},${DIR_RELATIVE_PATHS.DE_ROUTE_DOCUMENT_DETAIL_A} --noprompt --json`,
        {
          ensureExitCode: 0,
        }
      ).jsonOutput.result.deletedSource;

      assertDocumentDetailPageA(deletedSource);
      await assertDocumentDetailPageADelete(session, true);
    });
  });
});
