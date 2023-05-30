/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { join, relative } from 'path';
import * as fs from 'fs';
import { FileResponse } from '@salesforce/source-deploy-retrieve';
import { expect } from 'chai';
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { StatusResult } from '../../../src/formatters/source/statusFormatter';
import { isNameObsolete } from '../shared/isNameObsolete';
import { RetrieveCommandResult } from '../../../src/formatters/retrieveResultFormatter';
import { DEBS, DIR_RELATIVE_PATHS, FILE_RELATIVE_PATHS, FULL_NAMES, STORE, TYPES } from './constants';

type CustomFileResponses = Array<Pick<FileResponse, 'filePath' | 'fullName' | 'type'>>;

export function assertAllDEBAndTheirDECounts(
  resp: CustomFileResponses,
  otherComponentsCount = 0,
  assertTotalCount = true
) {
  if (assertTotalCount) expect(resp).to.have.length(104 + otherComponentsCount);

  expect(
    resp.reduce(
      (acc: [number, number, number, number], curr: FileResponse) => {
        if (curr.type === TYPES.DE.name && curr.fullName.includes(FULL_NAMES.DEB_A)) acc[0]++;
        if (curr.type === TYPES.DE.name && curr.fullName.includes(FULL_NAMES.DEB_B)) acc[1]++;
        if (curr.type === TYPES.DEB.name && curr.fullName === FULL_NAMES.DEB_A) acc[2]++;
        if (curr.type === TYPES.DEB.name && curr.fullName === FULL_NAMES.DEB_B) acc[3]++;
        return acc;
      },
      [0, 0, 0, 0]
    ),
    JSON.stringify(resp)
  ).to.deep.equal([51, 51, 1, 1]);
}

export function assertSingleDEBAndItsDECounts(resp: CustomFileResponses, debFullName: string) {
  expect(resp).to.have.length(52);
  expect(
    resp.reduce(
      (acc: [number, number], curr: FileResponse) => {
        if (curr.type === TYPES.DE.name && curr.fullName.includes(debFullName)) acc[0]++;
        if (curr.type === TYPES.DEB.name && curr.fullName === debFullName) acc[1]++;
        return acc;
      },
      [0, 0]
    ),
    JSON.stringify(resp)
  ).to.deep.equal([51, 1]);
}

export function assertDECountsOfAllDEB(resp: CustomFileResponses) {
  expect(resp).to.have.length(102);
  expect(
    resp.reduce(
      (acc: [number, number], curr: FileResponse) => {
        if (curr.type === TYPES.DE.name && curr.fullName.includes(FULL_NAMES.DEB_A)) acc[0]++;
        if (curr.type === TYPES.DE.name && curr.fullName.includes(FULL_NAMES.DEB_B)) acc[1]++;
        return acc;
      },
      [0, 0]
    ),
    JSON.stringify(resp)
  ).to.deep.equal([51, 51]);
}

export function assertDECountOfSingleDEB(resp: CustomFileResponses) {
  expect(resp).to.have.length(51);
  expect(resp.every((s) => s.type === TYPES.DE.name)).to.be.true;
}

export function assertDEBMeta(resp: CustomFileResponses, deb: 'A' | 'B') {
  expect(resp).to.have.length(1);

  resp[0].filePath = relative(process.cwd(), resp[0].filePath);

  expect(resp[0]).to.include({
    type: TYPES.DEB.name,
    fullName: DEBS[deb].FULL_NAME,
    filePath: DEBS[deb].FILES.META.RELATIVE_PATH,
  });
}

export function assertViewHome(resp: CustomFileResponses, deb: 'A' | 'B') {
  expect(resp).to.have.length(3);
  expect(
    resp.map((s) => ({
      type: s.type,
      fullName: s.fullName,
      filePath: relative(process.cwd(), s.filePath),
    }))
  ).to.have.deep.members([
    {
      type: TYPES.DE.name,
      fullName: DEBS[deb].DE.VIEW_HOME.FULL_NAME,
      filePath: DEBS[deb].DE.VIEW_HOME.FILES.CONTENT.RELATIVE_PATH,
    },
    {
      type: TYPES.DE.name,
      fullName: DEBS[deb].DE.VIEW_HOME.FULL_NAME,
      filePath: DEBS[deb].DE.VIEW_HOME.FILES.FR_VARIANT.RELATIVE_PATH,
    },
    {
      type: TYPES.DE.name,
      fullName: DEBS[deb].DE.VIEW_HOME.FULL_NAME,
      filePath: DEBS[deb].DE.VIEW_HOME.FILES.META.RELATIVE_PATH,
    },
  ]);
}

export function assertViewHomeStatus(
  resp: CustomFileResponses,
  deb: 'A' | 'B',
  type: 'CONTENT' | 'META' | 'FR_VARIANT'
) {
  expect(resp).to.have.length(1);

  resp[0].filePath = relative(process.cwd(), resp[0].filePath);

  expect(resp[0]).to.include({
    type: TYPES.DE.name,
    fullName: DEBS[deb].DE.VIEW_HOME.FULL_NAME,
    filePath: DEBS[deb].DE.VIEW_HOME.FILES[type].RELATIVE_PATH,
  });
}

export function assertDocumentDetailPageA(resp: CustomFileResponses) {
  expect(resp).to.have.length(4);
  expect(
    resp.map((s) => ({
      type: s.type,
      fullName: s.fullName,
      filePath: relative(process.cwd(), s.filePath),
    }))
  ).to.have.deep.members([
    {
      type: TYPES.DE.name,
      fullName: FULL_NAMES.DE_VIEW_DOCUMENT_DETAIL_A,
      filePath: FILE_RELATIVE_PATHS.DE_VIEW_DOCUMENT_DETAIL_META_A,
    },
    {
      type: TYPES.DE.name,
      fullName: FULL_NAMES.DE_VIEW_DOCUMENT_DETAIL_A,
      filePath: FILE_RELATIVE_PATHS.DE_VIEW_DOCUMENT_DETAIL_CONTENT_A,
    },
    {
      type: TYPES.DE.name,
      fullName: FULL_NAMES.DE_ROUTE_DOCUMENT_DETAIL_A,
      filePath: FILE_RELATIVE_PATHS.DE_ROUTE_DOCUMENT_DETAIL_META_A,
    },
    {
      type: TYPES.DE.name,
      fullName: FULL_NAMES.DE_ROUTE_DOCUMENT_DETAIL_A,
      filePath: FILE_RELATIVE_PATHS.DE_ROUTE_DOCUMENT_DETAIL_CONTENT_A,
    },
  ]);
}

export async function assertDocumentDetailPageADelete(session: TestSession, assertDeleteInLocal: boolean) {
  expect(
    await isNameObsolete(session.orgs.get('default').username, TYPES.DE.name, FULL_NAMES.DE_VIEW_DOCUMENT_DETAIL_A)
  ).to.be.true;
  expect(
    await isNameObsolete(session.orgs.get('default').username, TYPES.DE.name, FULL_NAMES.DE_ROUTE_DOCUMENT_DETAIL_A)
  ).to.be.true;

  if (assertDeleteInLocal) {
    expect(fs.existsSync(join(session.project.dir, DIR_RELATIVE_PATHS.DE_VIEW_DOCUMENT_DETAIL_A))).to.be.false;
    expect(fs.existsSync(join(session.project.dir, DIR_RELATIVE_PATHS.DE_ROUTE_DOCUMENT_DETAIL_A))).to.be.false;
  }
}

export function assertViewHomeFRVariantDelete(resp: CustomFileResponses, deb: 'A' | 'B', projectDir: string) {
  expect(resp).to.have.length(2);

  const inboundFiles = execCmd<RetrieveCommandResult>(
    `force:source:retrieve --manifest ${DEBS[deb].DE.VIEW_HOME.MANIFEST} --json`,
    {
      ensureExitCode: 0,
    }
  ).jsonOutput.result.inboundFiles;

  expect(inboundFiles).to.have.length(2);
  expect(fs.existsSync(join(projectDir, DEBS[deb].DE.VIEW_HOME.FILES.FR_VARIANT.RELATIVE_PATH))).to.be.false;
}

export function assertNoLocalChanges() {
  const statusResult = execCmd<StatusResult[]>('force:source:status --local --json', {
    ensureExitCode: 0,
  }).jsonOutput.result;
  expect(statusResult).to.deep.equal([]);
}

export function createDocumentDetailPageAInLocal(projectDir: string) {
  fs.cpSync(STORE.COMPONENTS.DE_VIEW_DOCUMENT_DETAIL, join(projectDir, DIR_RELATIVE_PATHS.DE_VIEW_DOCUMENT_DETAIL_A), {
    recursive: true,
  });

  fs.cpSync(
    STORE.COMPONENTS.DE_ROUTE_DOCUMENT_DETAIL,
    join(projectDir, DIR_RELATIVE_PATHS.DE_ROUTE_DOCUMENT_DETAIL_A),
    {
      recursive: true,
    }
  );
}

export async function deleteDocumentDetailPageAInLocal(projectDir: string) {
  await fs.promises.rm(join(projectDir, DIR_RELATIVE_PATHS.DE_VIEW_DOCUMENT_DETAIL_A), { recursive: true });
  await fs.promises.rm(join(projectDir, DIR_RELATIVE_PATHS.DE_ROUTE_DOCUMENT_DETAIL_A), { recursive: true });
}

export async function deleteViewHomeFRVariantInLocal(deb: 'A' | 'B', projectDir: string) {
  await fs.promises.rm(join(projectDir, DEBS[deb].DE.VIEW_HOME.FILES.FR_VARIANT.RELATIVE_PATH));
}

export async function deleteLocalSource(sourceRelativePath: string, projectDir: string) {
  // delete and recreate an empty dir
  await fs.promises.rm(join(projectDir, sourceRelativePath), { recursive: true });
  await fs.promises.mkdir(join(projectDir, sourceRelativePath));
}
