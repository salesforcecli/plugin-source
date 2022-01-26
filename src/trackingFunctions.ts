/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { UX } from '@salesforce/command';
import { SourceTracking, SourceTrackingOptions, ChangeResult } from '@salesforce/source-tracking';
import { Messages, SfdxError } from '@salesforce/core';
import { RetrieveResult, DeployResult, ComponentStatus, ComponentSet } from '@salesforce/source-deploy-retrieve';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'tracking');

interface TrackingSetupRequest extends SourceTrackingOptions {
  ignoreConflicts: boolean;
  ux: UX;
}

interface TrackingUpdateRequest {
  tracking: SourceTracking;
  result: DeployResult | RetrieveResult;
  ux: UX;
}

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
  ux: UX;
}): Promise<ChangeResult[]> => {
  const filteredConflicts = (await tracking.getConflicts()).filter((cr) =>
    components.has({ fullName: cr.name, type: cr.type })
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
  const { ux, ignoreConflicts: overwriteConflicts, ...createOptions } = options;
  const tracking = await SourceTracking.create(createOptions);
  if (!overwriteConflicts) {
    processConflicts(await tracking.getConflicts(), ux, messages.getMessage('conflictMsg'));
  }
  return tracking;
};

/**
 * Shared function for taking a Deploy/Retrieve result and handle the source tracking updates
 *
 * @param options
 */

export const updateTracking = async ({ tracking, result, ux }: TrackingUpdateRequest): Promise<void> => {
  // might not exist if we exited from retrieve early
  if (!result) {
    return;
  }
  ux.startSpinner('Updating source tracking');

  const successes = result.getFileResponses().filter((fileResponse) => fileResponse.state !== ComponentStatus.Failed);
  if (!successes.length) {
    ux.stopSpinner();
    return;
  }

  await Promise.all([
    tracking.updateLocalTracking(
      result instanceof RetrieveResult
        ? { files: successes.map((fileResponse) => fileResponse.filePath).filter(Boolean) }
        : {
            files: successes
              .filter((fileResponse) => fileResponse.state !== ComponentStatus.Deleted)
              .map((fileResponse) => fileResponse.filePath),
            deletedFiles: successes
              .filter((fileResponse) => fileResponse.state === ComponentStatus.Deleted)
              .map((fileResponse) => fileResponse.filePath),
          }
    ),
    tracking.updateRemoteTracking(
      successes.map(({ state, fullName, type, filePath }) => ({ state, fullName, type, filePath })),
      result instanceof RetrieveResult
    ),
  ]);

  ux.stopSpinner();
};

const writeConflictTable = (conflicts: ChangeResult[], ux: UX): void => {
  ux.table(
    conflicts.map((conflict) => ({ ...conflict, state: 'Conflict' })),
    {
      columns: [
        { label: 'STATE', key: 'state' },
        { label: 'FULL NAME', key: 'name' },
        { label: 'TYPE', key: 'type' },
        { label: 'PROJECT PATH', key: 'filenames' },
      ],
    }
  );
};

/**
 * Write a table (if not json) and throw an error that includes a custom message and the conflict data
 *
 * @param conflicts
 * @param ux
 * @param message
 */
const processConflicts = (conflicts: ChangeResult[], ux: UX, message: string): void => {
  if (conflicts.length === 0) {
    return;
  }
  writeConflictTable(conflicts, ux);
  const err = new SfdxError(message);
  err.setData(conflicts);
  throw err;
};
