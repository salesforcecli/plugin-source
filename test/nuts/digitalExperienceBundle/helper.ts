/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { join } from 'path';
import * as fs from 'fs';
import { FileResponse } from '@salesforce/source-deploy-retrieve';
import { expect } from 'chai';
import { execCmd } from '@salesforce/cli-plugins-testkit';
import { StatusResult } from '../../../src/formatters/source/statusFormatter';
import { DIR_RELATIVE_PATHS, FILE_RELATIVE_PATHS, FULL_NAMES, STORE, TYPES } from './constants';

type CustomFileResponses = Array<Pick<FileResponse, 'filePath' | 'fullName' | 'type'>>;

export function assertAllDEBAndTheirDECounts(resp: CustomFileResponses, assertTotalCount: boolean) {
  if (assertTotalCount) expect(resp).to.have.length(102);

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
  ).to.deep.equal([50, 50, 1, 1]);
}

export function assertSingleDEBAndItsDECounts(
  resp: CustomFileResponses,
  debFullName: string,
  assertTotalCount: boolean
) {
  if (assertTotalCount) expect(resp).to.have.length(51);

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
  ).to.deep.equal([50, 1]);
}

export function assertAllDECounts(resp: CustomFileResponses, assertTotalCount: boolean) {
  if (assertTotalCount) expect(resp).to.have.length(100);

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
  ).to.deep.equal([50, 50]);
}

export function assertDEB(resp: CustomFileResponses, deb: 'a' | 'b', isStatus: boolean, projectDir: string) {
  expect(resp).to.have.length(1);
  expect(resp[0]).to.include({
    type: TYPES.DEB.name,
    fullName: deb === 'a' ? FULL_NAMES.DEB_A : FULL_NAMES.DEB_B,
    filePath: join(
      isStatus ? '' : projectDir,
      deb === 'a' ? FILE_RELATIVE_PATHS.DEB_META_A : FILE_RELATIVE_PATHS.DEB_META_B
    ),
  });
}

export function assertViewHome(resp: CustomFileResponses, deb: 'a' | 'b', projectDir: string) {
  expect(resp).to.have.length(2);
  expect(resp.map((s) => ({ type: s.type, fullName: s.fullName, filePath: s.filePath }))).to.have.deep.members([
    {
      type: TYPES.DE.name,
      fullName: deb === 'a' ? FULL_NAMES.DE_VIEW_HOME_A : FULL_NAMES.DE_VIEW_HOME_B,
      filePath: join(
        projectDir,
        deb === 'a' ? FILE_RELATIVE_PATHS.DE_VIEW_HOME_CONTENT_A : FILE_RELATIVE_PATHS.DE_VIEW_HOME_CONTENT_B
      ),
    },
    {
      type: TYPES.DE.name,
      fullName: deb === 'a' ? FULL_NAMES.DE_VIEW_HOME_A : FULL_NAMES.DE_VIEW_HOME_B,
      filePath: join(
        projectDir,
        deb === 'a' ? FILE_RELATIVE_PATHS.DE_VIEW_HOME_META_A : FILE_RELATIVE_PATHS.DE_VIEW_HOME_META_B
      ),
    },
  ]);
}

export function assertViewHomeStatus(resp: CustomFileResponses, deb: 'a' | 'b', type: 'content' | 'meta') {
  expect(resp).to.have.length(1);
  expect(resp[0]).to.include({
    type: TYPES.DE.name,
    fullName: deb === 'a' ? FULL_NAMES.DE_VIEW_HOME_A : FULL_NAMES.DE_VIEW_HOME_B,
    filePath:
      deb === 'a'
        ? type === 'content'
          ? FILE_RELATIVE_PATHS.DE_VIEW_HOME_CONTENT_A
          : FILE_RELATIVE_PATHS.DE_VIEW_HOME_META_A
        : type === 'content'
        ? FILE_RELATIVE_PATHS.DE_VIEW_HOME_CONTENT_B
        : FILE_RELATIVE_PATHS.DE_VIEW_HOME_META_B,
  });
}

export function assertDocumentDetailPageA(resp: CustomFileResponses, isStatus: boolean, projectDir: string) {
  expect(resp).to.have.length(4);
  expect(resp.map((s) => ({ type: s.type, fullName: s.fullName, filePath: s.filePath }))).to.have.deep.members([
    {
      type: TYPES.DE.name,
      fullName: FULL_NAMES.DE_VIEW_DOCUMENT_DETAIL_A,
      filePath: join(isStatus ? '' : projectDir, FILE_RELATIVE_PATHS.DE_VIEW_DOCUMENT_DETAIL_META_A),
    },
    {
      type: TYPES.DE.name,
      fullName: FULL_NAMES.DE_VIEW_DOCUMENT_DETAIL_A,
      filePath: join(isStatus ? '' : projectDir, FILE_RELATIVE_PATHS.DE_VIEW_DOCUMENT_DETAIL_CONTENT_A),
    },
    {
      type: TYPES.DE.name,
      fullName: FULL_NAMES.DE_ROUTE_DOCUMENT_DETAIL_A,
      filePath: join(isStatus ? '' : projectDir, FILE_RELATIVE_PATHS.DE_ROUTE_DOCUMENT_DETAIL_META_A),
    },
    {
      type: TYPES.DE.name,
      fullName: FULL_NAMES.DE_ROUTE_DOCUMENT_DETAIL_A,
      filePath: join(isStatus ? '' : projectDir, FILE_RELATIVE_PATHS.DE_ROUTE_DOCUMENT_DETAIL_CONTENT_A),
    },
  ]);
}

export function assertNoLocalChanges() {
  const statusResult = execCmd<StatusResult[]>('force:source:status --local --json', {
    ensureExitCode: 0,
  }).jsonOutput.result;
  expect(statusResult).to.deep.equal([]);
}

export function createDocumentDetailPageAInLocal(projectDir: string) {
  fs.cpSync(STORE.COMPONENTS.VIEW_DOCUMENT_DETAIL, join(projectDir, DIR_RELATIVE_PATHS.DE_VIEW_DOCUMENT_DETAIL_A), {
    recursive: true,
  });

  fs.cpSync(STORE.COMPONENTS.ROUTE_DOCUMENT_DETAIL, join(projectDir, DIR_RELATIVE_PATHS.DE_ROUTE_DOCUMENT_DETAIL_A), {
    recursive: true,
  });
}

export async function deleteLocalSource(sourceRelativePath: string, projectDir: string) {
  // delete and recreate an empty dir
  await fs.promises.rm(join(projectDir, sourceRelativePath), { recursive: true });
  await fs.promises.mkdir(join(projectDir, sourceRelativePath));
}
