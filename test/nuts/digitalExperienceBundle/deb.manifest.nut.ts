/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as fs from 'fs';
import { join } from 'path';
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { expect } from 'chai';
import { beforeEach } from 'mocha';
import { DeployCommandResult } from '../../../lib/formatters/deployResultFormatter';
import { RetrieveCommandResult } from '../../../lib/formatters/retrieveResultFormatter';
import { DEBS_RELATIVE_PATH, FULL_NAMES, METADATA, STORE, TEST_SESSION_OPTIONS, TYPES } from './constants';
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

describe('deb -- manifest option', () => {
  let session: TestSession;

  before(async () => {
    session = await TestSession.create(TEST_SESSION_OPTIONS);
  });

  after(async () => {
    await session?.clean();
  });

  // skip while manifest create moves to plugin-deploy-retrieve
  describe.skip('generate manifest', () => {
    it('should generate manifest for all debs using sourcepath', () => {
      execCmd(
        `force:source:manifest:create --sourcepath ${DEBS_RELATIVE_PATH} --manifestname ${STORE.MANIFESTS.ALL_DEBS_SOURCE_PATH_GEN} --json`,
        { ensureExitCode: 0 }
      );
      expect(fs.existsSync(join(session.project.dir, STORE.MANIFESTS.ALL_DEBS_SOURCE_PATH_GEN))).to.be.true;
    });

    it('should generate manifest for all debs using metadata', () => {
      execCmd(
        `force:source:manifest:create --metadata ${METADATA.ALL_DEBS} --manifestname ${STORE.MANIFESTS.ALL_DEBS_METADATA_GEN} --json`,
        { ensureExitCode: 0 }
      );
      expect(fs.existsSync(join(session.project.dir, STORE.MANIFESTS.ALL_DEBS_METADATA_GEN))).to.be.true;
    });
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
        `force:source:deploy --manifest ${STORE.MANIFESTS.FULL_SITE_DEB_A_AND_B} --json`,
        {
          ensureExitCode: 0,
        }
      ).jsonOutput.result.deployedSource;

      assertAllDEBAndTheirDECounts(deployedSource, 6);
    });

    describe('individual metadata type', () => {
      it('should deploy deb type (all debs - deb_a and deb_b)', () => {
        const deployedSource = execCmd<DeployCommandResult>(
          `force:source:deploy --manifest ${STORE.MANIFESTS.ALL_DEBS} --json`,
          {
            ensureExitCode: 0,
          }
        ).jsonOutput.result.deployedSource;

        assertAllDEBAndTheirDECounts(deployedSource);
      });

      it('should deploy de type (all de components of deb_a and deb_b)', () => {
        const deployedSource = execCmd<DeployCommandResult>(
          `force:source:deploy --manifest ${STORE.MANIFESTS.ALL_DE} --json`,
          {
            ensureExitCode: 0,
          }
        ).jsonOutput.result.deployedSource;

        assertDECountsOfAllDEB(deployedSource);
      });
    });

    describe('individual metadata item', () => {
      it('should deploy all de components of deb_a', () => {
        const deployedSource = execCmd<DeployCommandResult>(
          `force:source:deploy --manifest ${STORE.MANIFESTS.ALL_DE_OF_DEB_A} --json`,
          {
            ensureExitCode: 0,
          }
        ).jsonOutput.result.deployedSource;

        assertDECountOfSingleDEB(deployedSource);
      });

      it('should deploy just deb_a', () => {
        const deployedSource = execCmd<DeployCommandResult>(
          `force:source:deploy --manifest ${STORE.MANIFESTS.JUST_DEB_A} --json`,
          {
            ensureExitCode: 0,
          }
        ).jsonOutput.result.deployedSource;

        assertSingleDEBAndItsDECounts(deployedSource, FULL_NAMES.DEB_A);
      });

      it('should deploy de_view_home of deb_a', () => {
        const deployedSource = execCmd<DeployCommandResult>(
          `force:source:deploy --manifest ${STORE.MANIFESTS.DE_VIEW_HOME_OF_DEB_A} --json`,
          {
            ensureExitCode: 0,
          }
        ).jsonOutput.result.deployedSource;

        assertViewHome(deployedSource, 'a');
      });
    });

    // skip while manifest create moves to plugin-deploy-retrieve
    describe.skip('through generated manifests', () => {
      it('should deploy all debs using the manifest generated by sourcepath', () => {
        const deployedSource = execCmd<DeployCommandResult>(
          `force:source:deploy --manifest ${STORE.MANIFESTS.ALL_DEBS_SOURCE_PATH_GEN} --json`,
          {
            ensureExitCode: 0,
          }
        ).jsonOutput.result.deployedSource;

        assertAllDEBAndTheirDECounts(deployedSource);
      });

      it('should deploy all debs using the manifest generated by metadata', () => {
        const deployedSource = execCmd<DeployCommandResult>(
          `force:source:deploy --manifest ${STORE.MANIFESTS.ALL_DEBS_METADATA_GEN} --json`,
          {
            ensureExitCode: 0,
          }
        ).jsonOutput.result.deployedSource;

        assertAllDEBAndTheirDECounts(deployedSource);
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
          `force:source:retrieve --manifest ${STORE.MANIFESTS.ALL_DEBS} --json`,
          {
            ensureExitCode: 0,
          }
        ).jsonOutput.result.inboundFiles;

        assertAllDEBAndTheirDECounts(inboundFiles);
      });

      it('should retrieve de type (all de components of deb_a and deb_b)', async () => {
        const inboundFiles = execCmd<RetrieveCommandResult>(
          `force:source:retrieve --manifest ${STORE.MANIFESTS.ALL_DE} --json`,
          {
            ensureExitCode: 0,
          }
        ).jsonOutput.result.inboundFiles;

        assertDECountsOfAllDEB(inboundFiles);
      });
    });

    describe('individual metadata item', () => {
      it('should retrieve all de components of deb_a', async () => {
        const inboundFiles = execCmd<RetrieveCommandResult>(
          `force:source:retrieve --manifest ${STORE.MANIFESTS.ALL_DE_OF_DEB_A} --json`,
          {
            ensureExitCode: 0,
          }
        ).jsonOutput.result.inboundFiles;

        assertDECountOfSingleDEB(inboundFiles);
      });

      it('should retrieve just deb_a', async () => {
        const inboundFiles = execCmd<RetrieveCommandResult>(
          `force:source:retrieve --manifest ${STORE.MANIFESTS.JUST_DEB_A} --json`,
          {
            ensureExitCode: 0,
          }
        ).jsonOutput.result.inboundFiles;

        assertSingleDEBAndItsDECounts(inboundFiles, FULL_NAMES.DEB_A);
      });

      it('should retrieve de_view_home of deb_a', async () => {
        const inboundFiles = execCmd<RetrieveCommandResult>(
          `force:source:retrieve --manifest ${STORE.MANIFESTS.DE_VIEW_HOME_OF_DEB_A} --json`,
          {
            ensureExitCode: 0,
          }
        ).jsonOutput.result.inboundFiles;

        assertViewHome(inboundFiles, 'a');
      });
    });

    // skip while manifest create moves to plugin-deploy-retrieve
    describe.skip('through generated manifests', () => {
      it('should retrieve all debs using the manifest generated by sourcepath', async () => {
        const inboundFiles = execCmd<RetrieveCommandResult>(
          `force:source:retrieve --manifest ${STORE.MANIFESTS.ALL_DEBS_SOURCE_PATH_GEN} --json`,
          {
            ensureExitCode: 0,
          }
        ).jsonOutput.result.inboundFiles;

        assertAllDEBAndTheirDECounts(inboundFiles);
      });

      it('should retrieve all debs using the manifest generated by metadata', async () => {
        const inboundFiles = execCmd<RetrieveCommandResult>(
          `force:source:retrieve --manifest ${STORE.MANIFESTS.ALL_DEBS_METADATA_GEN} --json`,
          {
            ensureExitCode: 0,
          }
        ).jsonOutput.result.inboundFiles;

        assertAllDEBAndTheirDECounts(inboundFiles);
      });
    });
  });

  describe('new site page', () => {
    it('should deploy new page (view and route de components) of deb_a', async () => {
      createDocumentDetailPageAInLocal(session.project.dir);

      const deployedSource = execCmd<DeployCommandResult>(
        `force:source:deploy --manifest ${STORE.MANIFESTS.DE_DOCUMENT_DETAIL_PAGE_A} --json`,
        {
          ensureExitCode: 0,
        }
      ).jsonOutput.result.deployedSource;

      assertDocumentDetailPageA(deployedSource);
    });

    it('should delete new page (view and route de components) of deb_a', async () => {
      const deployedSource = execCmd<DeployCommandResult>(
        `force:source:deploy --manifest ${STORE.MANIFESTS.EMPTY_PACKAGE_XML} --predestructivechanges ${STORE.MANIFESTS.DE_DOCUMENT_DETAIL_PAGE_A} --json`,
        {
          ensureExitCode: 0,
        }
      ).jsonOutput.result.deployedSource;

      assertDocumentDetailPageA(deployedSource);
      await assertDocumentDetailPageADelete(session, false);
    });
  });
});
