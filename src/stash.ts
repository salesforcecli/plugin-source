/*
 * Copyright 2025, Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import fs from 'node:fs';

import { ConfigFile, Logger, Messages, SfError } from '@salesforce/core';
import { JsonMap, Optional } from '@salesforce/ts-types';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);

type StashFile = {
  isGlobal: boolean;
  filename: string;
}

export type StashKey = keyof typeof Stash.KEYS;

export type DeployData = {
  jobid: string;
} & JsonMap

export type MdRetrieveData = {
  jobid: string;
  retrievetargetdir: string;
  zipfilename?: string;
  unzip?: boolean;
} & JsonMap

export type StashData = DeployData | MdRetrieveData;

export class Stash {
  public static KEYS = {
    MDAPI_DEPLOY: 'MDAPI_DEPLOY',
    MDAPI_RETRIEVE: 'MDAPI_RETRIEVE',
    SOURCE_DEPLOY: 'SOURCE_DEPLOY',
  };

  // singleton instance of the stash file
  private static instance: ConfigFile<StashFile>;

  private static logger: Logger;

  // A map of Command.id to stash keys
  private static keyMap = {
    'force:mdapi:deploy': Stash.KEYS.MDAPI_DEPLOY,
    'force:mdapi:deploy:cancel': Stash.KEYS.MDAPI_DEPLOY,
    'force:mdapi:deploy:report': Stash.KEYS.MDAPI_DEPLOY,
    'force:mdapi:beta:deploy': Stash.KEYS.MDAPI_DEPLOY,
    'force:mdapi:beta:deploy:cancel': Stash.KEYS.MDAPI_DEPLOY,
    'force:mdapi:beta:deploy:report': Stash.KEYS.MDAPI_DEPLOY,
    'force:source:deploy': Stash.KEYS.SOURCE_DEPLOY,
    'force:source:deploy:cancel': Stash.KEYS.SOURCE_DEPLOY,
    'force:source:deploy:report': Stash.KEYS.SOURCE_DEPLOY,
    'force:mdapi:retrieve': Stash.KEYS.MDAPI_RETRIEVE,
    'force:mdapi:retrieve:report': Stash.KEYS.MDAPI_RETRIEVE,
    'force:mdapi:beta:retrieve': Stash.KEYS.MDAPI_RETRIEVE,
    'force:mdapi:beta:retrieve:report': Stash.KEYS.MDAPI_RETRIEVE,
  };

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}

  /**
   * Returns the value for the given stash key.
   *
   * @param key The StashKey
   * @returns The stash value for the given key.
   */
  public static get<T extends StashData>(key: StashKey): Optional<T> {
    const stash = Stash.getStashFile();
    Stash.logger.debug(`Getting ${key} data from ${stash.getPath()}`);
    return stash.get(key) as T;
  }

  /**
   * Returns the `StashKey` used by the Command.
   *
   * Within a command class you would typically call this as:
   *
   * `const stashEntry = Stash.get(Stash.getKey(this.id));`
   *
   * @param commandId The oclif Command.id.  E.g., `this.id`
   * @returns the `StashKey` to use for `Stash.get()` and `Stash.set()`
   */
  public static getKey(commandId: string): StashKey {
    const key = Stash.keyMap[commandId as keyof typeof Stash.keyMap] as StashKey;
    if (!key) {
      const messages = Messages.loadMessages('@salesforce/plugin-source', 'stash');
      throw new SfError(messages.getMessage('InvalidStashKey', [commandId]), 'InvalidStashKey');
    }
    return key;
  }

  /**
   * Sets deploy/retrieve data in the stash.
   *
   * @param key the `StashKey` for setting stashed deploy/retrieve values
   * @param data the `StashData` to persist.
   */
  public static set(key: StashKey, data: StashData): void {
    const stash = Stash.getStashFile();
    stash.set(key, data);
    Stash.logger.debug(`Stashing ${key} data: ${JSON.stringify(data)} in ${stash.getPath()}`);
    stash.writeSync();
  }

  /**
   * Clears all stash file entries.
   */
  public static clear(): void {
    const stash = Stash.getStashFile();
    Stash.logger.debug(`Clearing all stash contents in: ${stash.getPath()}`);
    stash.clear();
    stash.writeSync();
  }

  private static init(): void {
    Stash.logger = Logger.childFromRoot('source-plugin-stash');
    Stash.instance = new ConfigFile({ isGlobal: true, filename: 'stash.json' });
  }

  private static getStashFile(): ConfigFile<StashFile> {
    try {
      if (!Stash.instance) {
        Stash.init();
      }
      if (Stash.instance.existsSync()) {
        // Always read from the stash file before returning it
        Stash.instance.readSync(true);
      } else {
        Stash.instance.writeSync();
      }
    } catch (err: unknown) {
      const error = err as Error & { code: string };
      if (error.name === 'JsonParseError') {
        const stashFilePath = Stash.instance?.getPath();
        const corruptFilePath = `${stashFilePath}_corrupted_${Date.now()}`;
        fs.renameSync(stashFilePath, corruptFilePath);
        const messages = Messages.loadMessages('@salesforce/plugin-source', 'stash');
        throw new SfError(
          `${messages.getMessage('InvalidStashKey', [corruptFilePath])}\n\n${error.message}`,
          'InvalidStashFile',
          [],
          error
        );
      }
      throw SfError.wrap(error);
    }

    return Stash.instance;
  }
}
