/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import path from 'node:path';

import { ChangeResult, SourceTracking, SourceTrackingOptions } from '@salesforce/source-tracking';
import { Messages, SfError } from '@salesforce/core';
import {
  ComponentSet,
  ComponentStatus,
  DeployResult,
  FileResponse,
  RetrieveResult,
} from '@salesforce/source-deploy-retrieve';
import { Ux } from '@salesforce/sf-plugins-core';
Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'tracking');

type TrackingSetupRequest = {
  ignoreConflicts: boolean;
  ux: Ux;
} & SourceTrackingOptions;

type TrackingUpdateRequest = {
  tracking: SourceTracking;
  result: DeployResult | RetrieveResult;
  ux: Ux;
  /**
   * We don't want to get the fileResponses if there have been deletes (SDR will throw)
   * You can also pass this in if your command already ran getFileResponses and you want to avoid the perf hit from doing it twice
   */
  fileResponses?: FileResponse[];
};

type ConflictResponse = {
  state: 'Conflict';
  fullName: string;
  type: string;
  filePath: string;
};
/**
 * Check if any conflicts exist in a specific component set.
 * If conflicts exist, this will output the table and throw
 */
export const filterConflictsByComponentSet = async ({
  tracking,
  components,
  ux,
}: {
  tracking: SourceTracking;
  components: ComponentSet;
  ux: Ux;
}): Promise<ChangeResult[]> => {
  const filteredConflicts = (await tracking.getConflicts()).filter((cr) =>
    components.has({ fullName: cr.name as string, type: cr.type as string })
  );
  processConflicts(filteredConflicts, ux, messages.getMessage('conflictMsg'));
  return filteredConflicts;
};

/**
 * Init SourceTracking (STL) and do conflict detection
 *
 * @param options
 * @returns SourceTracking
 */
export const trackingSetup = async (options: TrackingSetupRequest): Promise<SourceTracking> => {
  const { ux, org, ignoreConflicts, ...createOptions } = options;
  const tracking = await SourceTracking.create({ org, ...createOptions });
  if (!ignoreConflicts) {
    processConflicts(await tracking.getConflicts(), ux, messages.getMessage('conflictMsg'));
  }
  return tracking;
};

/**
 * Shared function for taking a Deploy/Retrieve result and handle the source tracking updates
 *
 * @param options
 */
export const updateTracking = async ({ tracking, result, ux, fileResponses }: TrackingUpdateRequest): Promise<void> => {
  // might not exist if we exited from the operation early
  if (!result) {
    return;
  }
  ux.spinner.start('Updating source tracking');

  const successes = (fileResponses ?? result.getFileResponses()).filter(
    (fileResponse) => fileResponse.state !== ComponentStatus.Failed
  );
  if (!successes.length) {
    ux.spinner.stop();
    return;
  }

  await Promise.all([
    tracking.updateLocalTracking({
      files: successes
        .filter((fileResponse) => fileResponse.state !== ComponentStatus.Deleted)
        .map((fileResponse) => fileResponse.filePath),
      deletedFiles: successes
        .filter((fileResponse) => fileResponse.state === ComponentStatus.Deleted)
        .map((fileResponse) => fileResponse.filePath),
    }),
    tracking.updateRemoteTracking(
      successes.map(({ state, fullName, type, filePath }) => ({ state, fullName, type, filePath })),
      result instanceof RetrieveResult
    ),
  ]);

  ux.spinner.stop();
};

const writeConflictTable = (conflicts: ConflictResponse[], ux: Ux): void => {
  ux.table(conflicts, {
    state: { header: 'STATE' },
    fullName: { header: 'FULL NAME' },
    type: { header: 'TYPE' },
    filePath: { header: 'FILE PATH' },
  });
};

/**
 * Write a table (if not json) and throw an error that includes a custom message and the conflict data
 *
 * @param conflicts
 * @param ux
 * @param message
 */
const processConflicts = (conflicts: ChangeResult[], ux: Ux, message: string): void => {
  if (conflicts.length === 0) {
    return;
  }
  // map do dedupe by name-type-filename
  const conflictMap = new Map<string, ConflictResponse>();
  conflicts.forEach((c) => {
    c.filenames?.forEach((f) => {
      conflictMap.set(`${c.name}#${c.type}#${f}`, {
        state: 'Conflict',
        fullName: c.name as string,
        type: c.type as string,
        filePath: path.resolve(f),
      });
    });
  });
  const reformattedConflicts = Array.from(conflictMap.values());
  writeConflictTable(reformattedConflicts, ux);
  const err = new SfError(message, 'sourceConflictDetected');
  err.setData(reformattedConflicts);
  throw err;
};
