/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as fs from 'fs';
import { ConfigFile, Logger, SfdxError } from '@salesforce/core';
import { JsonMap, Optional } from '@salesforce/ts-types';

interface StashFile {
  isGlobal: boolean;
  filename: string;
}

export type StashKey = 'MDAPI_DEPLOY' | 'MDAPI_RETRIEVE' | 'SOURCE_DEPLOY';

export interface MdDeployData extends JsonMap {
  jobid: string;
}

export interface SrcDeployData extends JsonMap {
  jobid: string;
}

export interface MdRetrieveData extends JsonMap {
  jobid: string;
  retrievetargetdir: string;
  zipfilename?: string;
  unzip?: boolean;
}

export type StashData = MdDeployData | MdRetrieveData | SrcDeployData;

export class Stash {
  // singleton instance of the stash file
  private static instance: ConfigFile<StashFile>;

  private static logger: Logger;

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}

  public static get<T extends StashData>(key: StashKey): Optional<T> {
    return Stash.getStashFile().get(key) as T;
  }

  public static set(key: StashKey, data: StashData): void {
    const stash = Stash.getStashFile();
    stash.set(key, data);
    Stash.logger.debug(`Stashing ${key} data: ${JSON.stringify(data)} in ${stash.getPath()}`);
    stash.writeSync();
  }

  public static clear(): void {
    const stash = Stash.getStashFile();
    Stash.logger.debug(`Clearing all stash contents in: ${stash.getPath()}`);
    stash.clear();
    stash.writeSync();
  }

  private static init(): void {
    Stash.logger = Logger.childFromRoot('stash');
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
        const invalidStashErr = SfdxError.create('@salesforce/plugin-source', 'deploy', 'InvalidStashFile', [
          corruptFilePath,
        ]);
        invalidStashErr.message = `${invalidStashErr.message}\n${error.message}`;
        invalidStashErr.stack = `${invalidStashErr.stack}\nDue to:\n${error.stack}`;
        throw invalidStashErr;
      }
      throw SfdxError.wrap(error);
    }

    return Stash.instance;
  }
}
