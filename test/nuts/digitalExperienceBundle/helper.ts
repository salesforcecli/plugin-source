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
import { DIR_RELATIVE_PATHS, FILE_RELATIVE_PATHS, FULL_NAMES, STORE, TYPES } from './constants';

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

export function assertDEB(resp: CustomFileResponses, deb: 'a' | 'b') {
  expect(resp).to.have.length(1);

  resp[0].filePath = relative(process.cwd(), resp[0].filePath);

  expect(resp[0]).to.include({
    type: TYPES.DEB.name,
    fullName: deb === 'a' ? FULL_NAMES.DEB_A : FULL_NAMES.DEB_B,
    filePath: deb === 'a' ? FILE_RELATIVE_PATHS.DEB_META_A : FILE_RELATIVE_PATHS.DEB_META_B,
  });
}

export function assertViewHome(resp: CustomFileResponses, deb: 'a' | 'b') {
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
      fullName: deb === 'a' ? FULL_NAMES.DE_VIEW_HOME_A : FULL_NAMES.DE_VIEW_HOME_B,
      filePath: deb === 'a' ? FILE_RELATIVE_PATHS.DE_VIEW_HOME_CONTENT_A : FILE_RELATIVE_PATHS.DE_VIEW_HOME_CONTENT_B,
    },
    {
      type: TYPES.DE.name,
      fullName: deb === 'a' ? FULL_NAMES.DE_VIEW_HOME_A : FULL_NAMES.DE_VIEW_HOME_B,
      filePath:
        deb === 'a' ? FILE_RELATIVE_PATHS.DE_VIEW_HOME_FR_VARIANT_A : FILE_RELATIVE_PATHS.DE_VIEW_HOME_FR_VARIANT_B,
    },
    {
      type: TYPES.DE.name,
      fullName: deb === 'a' ? FULL_NAMES.DE_VIEW_HOME_A : FULL_NAMES.DE_VIEW_HOME_B,
      filePath: deb === 'a' ? FILE_RELATIVE_PATHS.DE_VIEW_HOME_META_A : FILE_RELATIVE_PATHS.DE_VIEW_HOME_META_B,
    },
  ]);
}

export function assertViewHomeStatus(resp: CustomFileResponses, deb: 'a' | 'b', type: 'content' | 'meta') {
  expect(resp).to.have.length(1);

  resp[0].filePath = relative(process.cwd(), resp[0].filePath);

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

export async function assertDocumentDetailPageADelete(session: TestSession, shouldBeDeletedInLocal: boolean) {
  expect(
    await isNameObsolete(session.orgs.get('default').username, TYPES.DE.name, FULL_NAMES.DE_VIEW_DOCUMENT_DETAIL_A)
  ).to.be.true;
  expect(
    await isNameObsolete(session.orgs.get('default').username, TYPES.DE.name, FULL_NAMES.DE_ROUTE_DOCUMENT_DETAIL_A)
  ).to.be.true;

  if (shouldBeDeletedInLocal) {
    expect(fs.existsSync(join(session.project.dir, DIR_RELATIVE_PATHS.DE_VIEW_DOCUMENT_DETAIL_A))).to.be.false;
    expect(fs.existsSync(join(session.project.dir, DIR_RELATIVE_PATHS.DE_ROUTE_DOCUMENT_DETAIL_A))).to.be.false;
  }
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

export async function deleteDocumentDetailPageAInLocal(projectDir: string) {
  await fs.promises.rm(join(projectDir, DIR_RELATIVE_PATHS.DE_VIEW_DOCUMENT_DETAIL_A), { recursive: true });
  await fs.promises.rm(join(projectDir, DIR_RELATIVE_PATHS.DE_ROUTE_DOCUMENT_DETAIL_A), { recursive: true });
}

export async function deleteLocalSource(sourceRelativePath: string, projectDir: string) {
  // delete and recreate an empty dir
  await fs.promises.rm(join(projectDir, sourceRelativePath), { recursive: true });
  await fs.promises.mkdir(join(projectDir, sourceRelativePath));
}
