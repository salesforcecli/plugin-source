/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
// import * as fs from 'fs';
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { expect } from 'chai';
import { DeployCommandResult } from '../../../lib/formatters/deployResultFormatter';
import { RetrieveCommandResult } from '../../../lib/formatters/retrieveResultFormatter';
import {
  DEB_A_RELATIVE_PATH,
  DEBS_RELATIVE_PATH,
  DIR_RELATIVE_PATHS,
  FULL_NAMES,
  TEST_SESSION_OPTIONS,
} from './constants';
import {
  assertAllDEBAndTheirDECounts,
  assertDocumentDetailPageA,
  assertSingleDEBAndItsDECounts,
  assertViewHome,
  createDocumentDetailPageAInLocal,
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
      execCmd<DeployCommandResult>('force:source:deploy -m "ApexPage,ApexClass" --json', {
        ensureExitCode: 0,
      });
    });

    it('should deploy complete enhanced lwr sites deb_a and deb_b (including de config, network and customsite)', () => {
      const deployedSource = execCmd<DeployCommandResult>(
        `force:source:deploy --sourcepath ${DEBS_RELATIVE_PATH},${DIR_RELATIVE_PATHS.DIGITAL_EXPERIENCE_CONFIGS},${DIR_RELATIVE_PATHS.NETWORKS},${DIR_RELATIVE_PATHS.SITES} --json`,
        {
          ensureExitCode: 0,
        }
      ).jsonOutput.result.deployedSource;

      expect(deployedSource).to.have.length(108);
      assertAllDEBAndTheirDECounts(deployedSource, false);
    });

    describe('individual metadata type', () => {
      it('should deploy deb type (all debs - deb_a and deb_b)', () => {
        const deployedSource = execCmd<DeployCommandResult>(
          `force:source:deploy --sourcepath ${DEBS_RELATIVE_PATH} --json`,
          {
            ensureExitCode: 0,
          }
        ).jsonOutput.result.deployedSource;

        assertAllDEBAndTheirDECounts(deployedSource, true);
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

        assertSingleDEBAndItsDECounts(deployedSource, FULL_NAMES.DEB_A, true);
      });

      it('should deploy de_view_home of deb_a', () => {
        const deployedSource = execCmd<DeployCommandResult>(
          `force:source:deploy --sourcepath ${DIR_RELATIVE_PATHS.DE_VIEW_HOME_A} --json`,
          {
            ensureExitCode: 0,
          }
        ).jsonOutput.result.deployedSource;

        assertViewHome(deployedSource, 'a', session.project.dir);
      });
    });
  });

  describe('retrieve', () => {
    describe('individual metadata type', () => {
      it('should retrieve deb type (all debs - deb_a and deb_b)', async () => {
        const inboundFiles = execCmd<RetrieveCommandResult>(
          `force:source:retrieve --sourcepath ${DEBS_RELATIVE_PATH} --json`,
          {
            ensureExitCode: 0,
          }
        ).jsonOutput.result.inboundFiles;

        assertAllDEBAndTheirDECounts(inboundFiles, true);
      });
    });

    describe('individual metadata item', () => {
      it('should retrieve just deb_a', async () => {
        const inboundFiles = execCmd<RetrieveCommandResult>(
          `force:source:retrieve --sourcepath ${DEB_A_RELATIVE_PATH} --json`,
          {
            ensureExitCode: 0,
          }
        ).jsonOutput.result.inboundFiles;

        assertSingleDEBAndItsDECounts(inboundFiles, FULL_NAMES.DEB_A, true);
      });

      it('should retrieve de_view_home of deb_a', async () => {
        const inboundFiles = execCmd<RetrieveCommandResult>(
          `force:source:retrieve --sourcepath ${DIR_RELATIVE_PATHS.DE_VIEW_HOME_A} --json`,
          {
            ensureExitCode: 0,
          }
        ).jsonOutput.result.inboundFiles;

        assertViewHome(inboundFiles, 'a', session.project.dir);
      });
    });
  });

  describe('new site page', () => {
    it('should deploy new page (view and route de components) of deb_a', async () => {
      createDocumentDetailPageAInLocal(session.project.dir);

      const deployedSource = execCmd<DeployCommandResult>(
        `force:source:deploy --sourcepath ${DIR_RELATIVE_PATHS.DE_VIEW_DOCUMENT_DETAIL_A},${DIR_RELATIVE_PATHS.DE_ROUTE_DOCUMENT_DETAIL_A} --json`,
        {
          ensureExitCode: 0,
        }
      ).jsonOutput.result.deployedSource;

      assertDocumentDetailPageA(deployedSource, false, session.project.dir);
    });

    it('should delete the page (view and route de components) of deb_a', () => {
      const deletedSource = execCmd<DeployCommandResult>(
        `force:source:delete --sourcepath ${DIR_RELATIVE_PATHS.DE_VIEW_DOCUMENT_DETAIL_A},${DIR_RELATIVE_PATHS.DE_ROUTE_DOCUMENT_DETAIL_A} --noprompt --json`,
        {
          ensureExitCode: 0,
        }
      ).jsonOutput.result.deletedSource;

      assertDocumentDetailPageA(deletedSource, false, session.project.dir);
    });
  });
});
