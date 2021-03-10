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
import * as fg from 'fast-glob';
import {
  BaseDeployResult,
  ComplexDeployResult,
  ConvertResult,
  DeployCancelResult,
  DeployReportResult,
  PullResult,
  PushResult,
  RetrieveResult,
  RunTestResult,
  SimpleDeployResult,
  SourceInfo,
  SourceState,
  StatusResult,
} from './types';
import { FileTracker } from './fileTracker';

export class Expectations {
  public constructor(private projectDir: string, private fileTracker: FileTracker, private packagePaths: string[]) {}

  public fileToBeChanged(file: string): void {
    const fileHistory = this.fileTracker.get(file);
    expect(fileHistory[fileHistory.length - 1].changedFromPrevious).to.be.true;
  }

  public async filesToBeDeployed(result: SimpleDeployResult, globs: string[]): Promise<void> {
    await this.filesToBePresent(result.deployedSource, globs);
  }

  public async filesToBeRetrieved(result: RetrieveResult, globs: string[]): Promise<void> {
    await this.filesToBePresent(result.inboundFiles, globs);
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

  public deployJsonToBeValid(result: SimpleDeployResult): void {
    expect(result).to.have.property('deployedSource');
    for (const deployedSource of result.deployedSource) {
      expect(deployedSource).to.have.property('filePath');
      expect(deployedSource).to.have.property('fullName');
      expect(deployedSource).to.have.property('type');
      expect(deployedSource).to.have.property('state');
    }
  }

  public retrieveJsonToBeValid(result: RetrieveResult): void {
    expect(result).to.have.property('inboundFiles');
    for (const inboundFile of result.inboundFiles) {
      expect(inboundFile).to.have.property('filePath');
      expect(inboundFile).to.have.property('fullName');
      expect(inboundFile).to.have.property('type');
      expect(inboundFile).to.have.property('state');
    }
  }

  public deployComplexJsonToBeValid(result: ComplexDeployResult): void {
    expect(result).to.have.property('outboundFiles');
    expect(result).to.have.property('completedDate');
    expect(result).to.have.property('startDate');

    this.deployBaseJsonToBeValid(result);
  }

  public deployReportJsonToBeValid(result: DeployReportResult): void {
    expect(result).to.have.property('completedDate');
    expect(result).to.have.property('startDate');

    this.deployBaseJsonToBeValid(result);
  }

  public deployCancelJsonToBeValid(result: DeployCancelResult): void {
    expect(result).to.have.property('canceledBy');
    expect(result).to.have.property('canceledByName');
    expect(result).to.have.property('details');
    this.toHavePropertyAndValue(result, 'status', 'Canceled');
  }

  public deployBaseJsonToBeValid(result: BaseDeployResult): void {
    expect(result).to.have.property('checkOnly');
    expect(result).to.have.property('createdBy');
    expect(result).to.have.property('createdByName');
    expect(result).to.have.property('details');
    expect(result).to.have.property('done');
    expect(result).to.have.property('id');
    expect(result).to.have.property('ignoreWarnings');
    expect(result).to.have.property('lastModifiedDate');
    expect(result).to.have.property('numberComponentErrors');
    expect(result).to.have.property('numberComponentsDeployed');
    expect(result).to.have.property('numberComponentsTotal');
    expect(result).to.have.property('numberTestErrors');
    expect(result).to.have.property('numberTestsCompleted');
    expect(result).to.have.property('numberTestsTotal');
    expect(result).to.have.property('rollbackOnError');
    expect(result).to.have.property('runTestsEnabled');
    expect(result).to.have.property('status');
    expect(result).to.have.property('success');

    expect(result.details).to.have.property('componentSuccesses');
    for (const success of result.details.componentSuccesses) {
      expect(success).to.have.property('changed');
      expect(success).to.have.property('componentType');
      expect(success).to.have.property('created');
      expect(success).to.have.property('createdDate');
      expect(success).to.have.property('deleted');
      expect(success).to.have.property('fileName');
      expect(success).to.have.property('fullName');
      expect(success).to.have.property('success');
    }
  }

  public deployTestResultsToBeValid(testResults: RunTestResult): void {
    expect(testResults).to.have.property('numFailures');
    expect(testResults).to.have.property('numTestsRun');
    expect(testResults).to.have.property('totalTime');

    if (testResults.successes) {
      for (const success of testResults.successes) {
        expect(success).to.have.property('id');
        expect(success).to.have.property('name');
        expect(success).to.have.property('namespace');
        expect(success).to.have.property('time');
        expect(success).to.have.property('methodName');
      }
    }

    if (testResults.codeCoverage) {
      for (const coverage of testResults.codeCoverage) {
        expect(coverage).to.have.property('id');
        expect(coverage).to.have.property('name');
        expect(coverage).to.have.property('namespace');
        expect(coverage).to.have.property('numLocations');
        expect(coverage).to.have.property('numLocationsNotCovered');
        expect(coverage).to.have.property('type');
      }
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

  public toHavePropertyAndValue(result: JsonMap, prop: string, value: unknown): void {
    expect(result).to.have.property(prop);
    expect(result[prop]).to.equal(value);
  }

  public toHavePropertyAndNotValue(result: JsonMap, prop: string, value: unknown): void {
    expect(result).to.have.property(prop);
    expect(result[prop]).to.not.equal(value);
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

  public async allMetaXmlsToBeDeployed(result: SimpleDeployResult, ...directories: string[]): Promise<void> {
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

  private async filesToBePresent(results: SourceInfo[], globs: string[]): Promise<void> {
    // eslint-disable-next-line no-console
    // console.log('----------------------');
    const filesToExpect: string[] = [];
    for (const glob of globs) {
      const fullGlob = [this.projectDir, glob].join('/');
      const globResults = await fg(fullGlob);
      // // eslint-disable-next-line no-console
      // console.log(fullGlob);
      // // eslint-disable-next-line no-console
      // console.log(globResults);
      filesToExpect.push(...globResults);
    }

    const truncatedFilesToExpect = filesToExpect.map((f) => f.replace(`${this.projectDir}${path.sep}`, ''));
    const actualFiles = results.map((d) => d.filePath);

    // // eslint-disable-next-line no-console
    // console.log(truncatedFilesToExpect);
    // // eslint-disable-next-line no-console
    // console.log(actualFiles);

    // const missingFiles = truncatedFilesToExpect.filter((f) => !actualFiles.includes(f));
    // // eslint-disable-next-line no-console
    // console.log(missingFiles);

    const everyExpectedFileFound = truncatedFilesToExpect.every((f) => actualFiles.includes(f));
    expect(truncatedFilesToExpect.length).to.be.greaterThan(0);
    expect(everyExpectedFileFound).to.be.true;
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
