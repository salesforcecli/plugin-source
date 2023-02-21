/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as path from 'path';

import {
  ChangeResult,
  getTrackingFileVersion,
  SourceTracking,
  SourceTrackingOptions,
  throwIfInvalid,
} from '@salesforce/source-tracking';
import { Messages, SfError } from '@salesforce/core';
import {
  ComponentSet,
  ComponentStatus,
  DeployResult,
  FileResponse,
  RetrieveResult,
} from '@salesforce/source-deploy-retrieve';
import { Ux } from '@salesforce/sf-plugins-core';
Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'tracking');

interface TrackingSetupRequest extends SourceTrackingOptions {
  ignoreConflicts: boolean;
  ux: Ux;
  commandName: string;
}

interface TrackingUpdateRequest {
  tracking: SourceTracking;
  result: DeployResult | RetrieveResult;
  ux: Ux;
  /**
   * We don't want to get the fileResponses if there have been deletes (SDR will throw)
   * You can also pass this in if your command already ran getFileResponses and you want to avoid the perf hit from doing it twice
   */
  fileResponses?: FileResponse[];
}

interface ConflictResponse {
  state: 'Conflict';
  fullName: string;
  type: string;
  filePath: string;
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
  ux: Ux;
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
  const { ux, org, ignoreConflicts, commandName, ...createOptions } = options;
  const projectPath = options.project.getPath();
  // 3 commands use throwIfInvalid
  if (commandName.endsWith('push') || commandName.endsWith('pull') || commandName.endsWith('status')) {
    throwIfInvalid({
      org,
      projectPath,
      toValidate: 'plugin-source',
      command: commandName,
    });
  }
  // confirm tracking file version is plugin-source for all --tracksource flags (deploy, retrieve, delete)
  if (getTrackingFileVersion(org, projectPath) === 'toolbelt') {
    throw new SfError(
      'You cannot use the "tracksource" flag with the old version of the tracking files',
      'sourceTrackingFileVersionMismatch',
      [
        'Clear the old version of the tracking files with "sfdx force:source:legacy:tracking:clear"',
        'Create a new org to use the new tracking files',
      ]
    );
  }

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
        fullName: c.name,
        type: c.type,
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
