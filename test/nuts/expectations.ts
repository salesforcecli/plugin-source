/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import { expect } from 'chai';
import { fs } from '@salesforce/core';
import { JsonMap } from '@salesforce/ts-types';
import {
  DeployResult,
  SourceInfo,
  PushResult,
  RetrieveResult,
  SourceState,
  StatusResult,
  PullResult,
  ConvertResult,
} from '../../src/sourceCommand';
import { FileTracker } from './fileTracker';

export class Expectations {
  public constructor(private projectDir: string, private fileTracker: FileTracker, private packagePaths: string[]) {}

  public fileToBeChanged(file: string): void {
    const fileHistory = this.fileTracker.get(file);
    expect(fileHistory[fileHistory.length - 1].changedFromPrevious).to.be.true;
  }

  public async filesToBeDeployed(result: DeployResult, files: string[]): Promise<void> {
    const filesToExpect: string[] = [];
    for (const file of files) {
      const filePath = path.join(this.projectDir, file);
      if (fs.statSync(filePath).isDirectory()) {
        filesToExpect.push(...(await traverseForFiles(filePath)));
      } else {
        filesToExpect.push(file);
      }
    }

    const truncatedFilesToExpect = filesToExpect.map((f) => f.replace(`${this.projectDir}${path.sep}`, ''));
    const deployedFiles = result.deployedSource.map((d) => d.filePath);
    const everyExpectedFileFound = truncatedFilesToExpect.every((f) => deployedFiles.includes(f));
    expect(everyExpectedFileFound).to.be.true;
  }

  public fileToBePushed(result: PushResult, file: string): void {
    const pushedFiles = result.pushedSource.map((d) => d.filePath);
    const expectedFileFound = pushedFiles.includes(file);
    expect(expectedFileFound).to.be.true;
  }

  public filesToBePushed(result: PushResult, files: string[]): void {
    const filesToExpect = files.map((f) => f.replace(`${this.projectDir}${path.sep}`, ''));
    const pushedFiles = result.pushedSource.map((d) => d.filePath);
    const everyExpectedFileFound = filesToExpect.every((f) => pushedFiles.includes(f));
    expect(everyExpectedFileFound).to.be.true;
  }

  public fileToBePulled(result: PullResult, file: string): void {
    const pulledFiles = result.pulledSource.map((d) => d.filePath);
    const expectedFileFound = pulledFiles.includes(file);
    expect(expectedFileFound).to.be.true;
  }

  public filesToBePulled(result: PullResult, files: string[]): void {
    const filesToExpect = files.map((f) => f.replace(`${this.projectDir}${path.sep}`, ''));
    const pulledFiles = result.pulledSource.map((d) => d.filePath);
    const everyExpectedFileFound = filesToExpect.every((f) => pulledFiles.includes(f));
    expect(everyExpectedFileFound).to.be.true;
  }

  public statusToBeEmpty(result: StatusResult): void {
    expect(result.length).to.equal(0);
  }

  public statusFilesToHaveState(result: StatusResult, state: SourceState, files: string[]): void {
    for (const file of files) {
      this.statusFileToHaveState(result, state, file);
    }
    expect(result.length).to.equal(files.length);
  }

  public statusFileToHaveState(result: StatusResult, state: SourceState, file: string): void {
    const expectedFile = result.find((r) => r.filePath === file);
    expect(expectedFile).to.not.be.undefined;
    expect(expectedFile.state).to.equal(state);
  }

  public statusToOnlyHaveState(result: StatusResult, state: SourceState): void {
    for (const entry of result) {
      expect(entry.state).to.equal(state);
    }
  }

  public statusToOnlyHaveConflicts(result: StatusResult): void {
    for (const entry of result) {
      expect(entry.state).to.include('(Conflict)');
    }
  }

  public deployJsonToBeValid(result: DeployResult): void {
    expect(result).to.have.property('deployedSource');
    for (const deployedSource of result.deployedSource) {
      expect(deployedSource).to.have.property('filePath');
      expect(deployedSource).to.have.property('fullName');
      expect(deployedSource).to.have.property('type');
      expect(deployedSource).to.have.property('state');
    }
  }

  public pushJsonToBeValid(result: PushResult): void {
    expect(result).to.have.property('pushedSource');
    for (const deployedSource of result.pushedSource) {
      expect(deployedSource).to.have.property('filePath');
      expect(deployedSource).to.have.property('fullName');
      expect(deployedSource).to.have.property('type');
      expect(deployedSource).to.have.property('state');
    }
  }

  public errorToHaveName(result: JsonMap, name: string): void {
    expect(result).to.have.property('name');
    expect(result.name).to.equal(name);
  }

  public toHaveProperty(result: JsonMap, prop: string): void {
    expect(result).to.have.property(prop);
  }

  public pullJsonToBeValid(result: PullResult): void {
    expect(result).to.have.property('pulledSource');
    for (const deployedSource of result.pulledSource) {
      expect(deployedSource).to.have.property('filePath');
      expect(deployedSource).to.have.property('fullName');
      expect(deployedSource).to.have.property('type');
      expect(deployedSource).to.have.property('state');
    }
  }

  public statusJsonToBeValid(result: StatusResult): void {
    for (const entry of result) {
      expect(entry).to.have.property('filePath');
      expect(entry).to.have.property('fullName');
      expect(entry).to.have.property('type');
      expect(entry).to.have.property('state');
    }
  }

  public convertJsonToBeValid(result: ConvertResult): void {
    expect(result).to.have.property('location');
    expect(result.location).to.be.a('string');
  }

  public async allMetaXmlsToBePushed(result: PushResult): Promise<void> {
    await this.allMetaXmlsToBePresent(result.pushedSource, this.packagePaths);
  }

  public async allMetaXmlsToBePulled(result: PullResult): Promise<void> {
    await this.allMetaXmlsToBePresent(result.pulledSource, this.packagePaths);
  }

  public async allMetaXmlsToBeDeployed(result: DeployResult, ...directories: string[]): Promise<void> {
    await this.allMetaXmlsToBePresent(result.deployedSource, directories);
  }

  public async allMetaXmlsToBeRetrieved(result: RetrieveResult, ...directories: string[]): Promise<void> {
    await this.allMetaXmlsToBePresent(result.inboundFiles, directories);
  }

  private async allMetaXmlsToBePresent(results: SourceInfo[], directories: string[]): Promise<void> {
    const expectedFileCount = await countFiles(directories, '-meta.xml');
    const actualFileCount = results.filter((d) => d.filePath.endsWith('-meta.xml')).length;
    expect(actualFileCount).to.equal(expectedFileCount);
  }
}

export async function traverseForFiles(
  dirPath: string,
  endsWithFilter = '',
  allFiles: string[] = []
): Promise<string[]> {
  const files = await fs.readdir(dirPath);

  for (const file of files) {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      allFiles = await traverseForFiles(filePath, endsWithFilter, allFiles);
    } else if (endsWithFilter) {
      if (file.endsWith(endsWithFilter)) {
        allFiles.push(path.join(dirPath, file));
      }
    } else {
      allFiles.push(path.join(dirPath, file));
    }
  }
  return allFiles;
}

async function countFiles(directories: string[], endsWithFilter = ''): Promise<number> {
  let fileCount = 0;
  for (const dir of directories) {
    fileCount += (await traverseForFiles(dir, endsWithFilter)).length;
  }
  return fileCount;
}
