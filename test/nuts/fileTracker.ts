/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import { fs } from '@salesforce/core';
import { Nullable } from '@salesforce/ts-types';
import { Context } from './types';

/**
 * This class maintains a map of tracked files. This is particularly useful
 * for determining if files have changed after a command has been executed
 */
export class FileTracker {
  private files = new Map<string, FileTracker.FileHistory[]>();
  public constructor(private context: Context) {}

  /**
   * Add a file to be tracked
   */
  public async track(file: string): Promise<void> {
    const entry = {
      annotation: 'initial state',
      hash: await this.getContentHash(file),
      changedFromPrevious: false,
      name: file,
    };
    this.files.set(file, [entry]);
  }

  /**
   * Returns tracked file's history
   */
  public get(file: string): FileTracker.FileHistory[] {
    return this.files.get(file) || [];
  }

  /**
   * Returns latest entry for file
   */
  public getLatest(file: string): Nullable<FileTracker.FileHistory> {
    const history = this.files.get(file);
    return history ? history[history.length - 1] : null;
  }

  /**
   * Update the file history for given file. Annotation is required since
   * it is useful for debugging/understanding a file's history
   */
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
      name: file,
    };

    this.files.set(file, [...entries, newEntry]);
  }

  /**
   * Update the history for all tracked files. Annotation is required since
   * it is useful for debugging/understanding a file's history
   */
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
    return file.includes(this.context.projectDir) ? file : path.join(this.context.projectDir, file);
  }
}

export namespace FileTracker {
  export type FileHistory = {
    annotation: string;
    hash: Nullable<string>;
    changedFromPrevious: boolean;
    name: string;
  };
}

/**
 * Returns all files in directory that match the filter
 */
export async function traverseForFiles(dirPath: string, regexFilter = /./, allFiles: string[] = []): Promise<string[]> {
  const files = await fs.readdir(dirPath);

  for (const file of files) {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      allFiles = await traverseForFiles(filePath, regexFilter, allFiles);
    } else if (regexFilter.test(file)) {
      allFiles.push(path.join(dirPath, file));
    }
  }
  return allFiles;
}

/**
 * Returns the number of files found in directories that match the filter
 */
export async function countFiles(directories: string[], regexFilter = /./): Promise<number> {
  let fileCount = 0;
  for (const dir of directories) {
    fileCount += (await traverseForFiles(dir, regexFilter)).length;
  }
  return fileCount;
}
