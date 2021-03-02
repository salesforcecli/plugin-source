/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import { fs } from '@salesforce/core';
import { Nullable } from '@salesforce/ts-types';

export class FileTracker {
  private files = new Map<string, FileTracker.FileHistory[]>();
  public constructor(private projectDir: string) {}

  public async track(file: string): Promise<void> {
    const entry = {
      annotation: 'initial state',
      hash: await this.getContentHash(file),
      changedFromPrevious: false,
    };
    this.files.set(file, [entry]);
  }

  public get(file: string): FileTracker.FileHistory[] {
    return this.files.get(file);
  }

  public async update(file: string, annotation: string): Promise<void> {
    if (!this.files.has(file)) {
      await this.track(file);
      return;
    }
    const latestHash = await this.getContentHash(file);
    const entries = this.files.get(file);
    const lastEntry = entries[entries.length - 1];
    const newEntry = {
      annotation,
      hash: latestHash,
      changedFromPrevious: lastEntry.hash !== latestHash,
    };

    this.files.set(file, [...entries, newEntry]);
  }

  public async updateAll(annotation: string): Promise<void> {
    const files = this.files.keys();
    for (const file of files) {
      await this.update(file, annotation);
    }
  }

  private async getContentHash(file: string): Promise<Nullable<string>> {
    const filePath = this.getFullPath(file);
    try {
      const filestat = await fs.stat(filePath);
      const isDirectory = filestat.isDirectory();
      const contents = isDirectory ? (await fs.readdir(filePath)).toString() : await fs.readFile(filePath);
      return fs.getContentHash(contents);
    } catch {
      return null;
    }
  }

  private getFullPath(file: string): string {
    return file.includes(this.projectDir) ? file : path.join(this.projectDir, file);
  }
}

export namespace FileTracker {
  export type FileHistory = {
    annotation: string;
    hash: Nullable<string>;
    changedFromPrevious: boolean;
  };
}
