/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import { expect, use } from 'chai';
import * as chaiEach from 'chai-each';
import { JsonMap } from '@salesforce/ts-types';
import * as fg from 'fast-glob';
import { fs } from '@salesforce/core';
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
import { FileTracker, countFiles } from './fileTracker';

use(chaiEach);

export class Assertions {
  public constructor(private projectDir: string, private fileTracker: FileTracker, private packagePaths: string[]) {}

  /**
   * Expect given file to be changed according to the file history provided by FileTracker
   */
  public fileToBeChanged(file: string): void {
    const fileHistory = this.fileTracker.get(file);
    expect(fileHistory[fileHistory.length - 1].changedFromPrevious, 'File to be changed').to.be.true;
  }

  /**
   * Finds all files in project based on the provided globs and expects them to exist in the deploy json response
   */
  public async filesToBeDeployed(result: SimpleDeployResult, globs: string[]): Promise<void> {
    await this.filesToBePresent(result.deployedSource, globs);
  }

  /**
   * Finds all files in project based on the provided globs and expects them to NOT exist in the deploy json response
   */
  public async filesToNotBeDeployed(result: SimpleDeployResult, globs: string[]): Promise<void> {
    await this.filesToNotBePresent(result.deployedSource, globs);
  }

  /**
   * Finds all files in project based on the provided globs and expects them to exist in the retrieve json response
   */
  public async filesToBeRetrieved(result: RetrieveResult, globs: string[]): Promise<void> {
    await this.filesToBePresent(result.inboundFiles, globs);
  }

  /**
   * Expects given file to exist
   */
  public async fileToExist(file: string): Promise<void> {
    const fileExists = await fs.fileExists(file);
    expect(fileExists, `${file} to exist`).to.be.true;
  }

  /**
   * Expects files to exist in convert output directory
   */
  public async filesToBeConverted(result: ConvertResult, globs: string[]): Promise<void> {
    const convertedFiles: string[] = [];
    for (const glob of globs) {
      const fullGlob = [result.location, glob].join('/');
      const globResults = await fg(fullGlob);
      const files = globResults.map((f) => path.basename(f));
      convertedFiles.push(...files);
    }
    expect(convertedFiles.length, 'files to be converted').to.be.greaterThan(0);
  }

  /**
   * Expect package to be present in json response and for the retrieved package to contain some files
   */
  public async packagesToBeRetrieved(result: RetrieveResult, name: string): Promise<void> {
    const retrievedPkg = result.packages.find((pkg) => pkg.name === name);
    expect(retrievedPkg, 'package to be returned in json response').to.not.be.undefined;
    expect(retrievedPkg, 'package to have name property').to.have.property('name');
    expect(retrievedPkg, 'package to have path property').to.have.property('path');
    await this.directoryToHaveSomeFiles(retrievedPkg.path);
  }

  /**
   * Expect given file to be found in the push json response
   */
  public fileToBePushed(result: PushResult, file: string): void {
    const pushedFiles = result.pushedSource.map((d) => d.filePath);
    const expectedFileFound = pushedFiles.includes(file);
    expect(expectedFileFound, `${file} to be present in json response`).to.be.true;
  }

  /**
   * Expect all given files to be found in the push json response
   */
  public filesToBePushed(result: PushResult, files: string[]): void {
    const filesToExpect = files.map((f) => f.replace(`${this.projectDir}${path.sep}`, ''));
    const pushedFiles = result.pushedSource.map((d) => d.filePath);
    const everyExpectedFileFound = filesToExpect.every((f) => pushedFiles.includes(f));
    expect(everyExpectedFileFound, 'all files to be present in json response').to.be.true;
  }

  /**
   * Expect given file to be found in the pull json response
   */
  public fileToBePulled(result: PullResult, file: string): void {
    const pulledFiles = result.pulledSource.map((d) => d.filePath);
    const expectedFileFound = pulledFiles.includes(file);
    expect(expectedFileFound, `${file} to be present in json response`).to.be.true;
  }

  /**
   * Expect all given files to be found in the pull json response
   */
  public filesToBePulled(result: PullResult, files: string[]): void {
    const filesToExpect = files.map((f) => f.replace(`${this.projectDir}${path.sep}`, ''));
    const pulledFiles = result.pulledSource.map((d) => d.filePath);
    const everyExpectedFileFound = filesToExpect.every((f) => pulledFiles.includes(f));
    expect(everyExpectedFileFound, 'all files to be present in json response').to.be.true;
  }

  /**
   * Expect the given directory to contain at least 1 file
   */
  public async directoryToHaveSomeFiles(directory: string): Promise<void> {
    const fullPath = directory.startsWith(this.projectDir) ? directory : path.join(this.projectDir, directory);
    const fileCount = await countFiles([fullPath]);
    expect(fileCount, `at least 1 file found in ${directory}`).to.be.greaterThan(0);
  }

  /**
   * Expect status to return no results
   */
  public statusToBeEmpty(result: StatusResult): void {
    expect(result.length, 'status to have no results').to.equal(0);
  }

  /**
   * Expect all given files to have the given state
   */
  public statusFilesToHaveState(result: StatusResult, state: SourceState, files: string[]): void {
    for (const file of files) {
      this.statusFileToHaveState(result, state, file);
    }
    expect(result.length, 'all files to be present in json response').to.equal(files.length);
  }

  /**
   * Expect given file to have the given state
   */
  public statusFileToHaveState(result: StatusResult, state: SourceState, file: string): void {
    const expectedFile = result.find((r) => r.filePath === file);
    expect(expectedFile, `${file} to be present in json response`).to.not.be.undefined;
    expect(expectedFile.state, `${file} to have state ${state}`).to.equal(state);
  }

  /**
   * Expect all given files to have the given state
   */
  public statusToOnlyHaveState(result: StatusResult, state: SourceState): void {
    const allStates = result.every((r) => r.state === state);
    expect(allStates, `all files to have ${state}`).to.be.true;
  }

  /**
   * Expect all files to have a conflict state
   */
  public statusToOnlyHaveConflicts(result: StatusResult): void {
    const allConflicts = result.every((r) => r.state.includes('Conflict'));
    expect(allConflicts, 'all results to show conflict state').to.be.true;
  }

  /**
   * Expect source:deploy json response to be valid
   */
  public deployJsonToBeValid(result: SimpleDeployResult): void {
    expect(result).to.have.property('deployedSource');
    expect(result.deployedSource, 'all deployed source to have expected keys').to.each.have.all.keys(
      'filePath',
      'fullName',
      'type',
      'state'
    );
  }

  /**
   * Expect source:retrieve json response to be valid
   */
  public retrieveJsonToBeValid(result: RetrieveResult): void {
    expect(result).to.have.property('inboundFiles');
    expect(result.inboundFiles, 'all retrieved source to have expected keys').to.each.have.all.keys(
      'filePath',
      'fullName',
      'type',
      'state'
    );

    if (result.packages) {
      expect(result.packages, 'all retrieved packages to have expected keys').to.each.have.all.keys('name', 'path');
    }
  }

  /**
   * Expect complex source:deploy json response to be valid
   */
  public deployComplexJsonToBeValid(result: ComplexDeployResult): void {
    expect(result).to.include.all.keys('outboundFiles', 'completedDate', 'startDate');

    this.deployBaseJsonToBeValid(result);
  }

  /**
   * Expect source:deploy:report json response to be valid
   */
  public deployReportJsonToBeValid(result: DeployReportResult): void {
    expect(result).to.include.all.keys('startDate', 'completedDate');
    this.deployBaseJsonToBeValid(result);
  }

  /**
   * Expect source:deploy:cancel json response to be valid
   */
  public deployCancelJsonToBeValid(result: DeployCancelResult): void {
    expect(result).to.include.all.keys('canceledBy', 'canceledByName', 'details');
    this.toHavePropertyAndValue(result, 'status', 'Canceled');
  }

  /**
   * Expect base source:deploy json response to be valid
   */
  public deployBaseJsonToBeValid(result: BaseDeployResult): void {
    expect(result).to.include.all.keys(
      'checkOnly',
      'createdBy',
      'createdByName',
      'details',
      'done',
      'id',
      'ignoreWarnings',
      'lastModifiedDate',
      'numberComponentErrors',
      'numberComponentsDeployed',
      'numberComponentsTotal',
      'numberTestErrors',
      'numberTestsCompleted',
      'numberTestsTotal',
      'rollbackOnError',
      'runTestsEnabled',
      'status',
      'success'
    );

    expect(result.details).to.have.property('componentSuccesses');
    expect(result.details.componentSuccesses, 'all componentSuccesses to have expected keys').to.each.include.all.keys(
      'changed',
      'componentType',
      'created',
      'createdDate',
      'deleted',
      'fileName',
      'fullName',
      'success'
    );
  }

  /**
   * Expect test results from source:deploy json response to be valid
   */
  public deployTestResultsToBeValid(testResults: RunTestResult): void {
    expect(testResults, 'deploy test results to have all expected keys').to.include.all.keys(
      'numFailures',
      'numTestsRun',
      'totalTime'
    );

    if (testResults.successes) {
      expect(testResults.successes, 'deploy test successes to have all expected keys').to.each.include.all.keys(
        'id',
        'name',
        'namespace',
        'time',
        'methodName'
      );
    }

    if (testResults.codeCoverage) {
      expect(testResults.codeCoverage, 'deploy code coverage to have all expected keys').to.each.include.all.keys(
        'id',
        'name',
        'namespace',
        'numLocations',
        'numLocationsNotCovered',
        'type'
      );
    }
  }

  /**
   * Expect source:push json response to be valid
   */
  public pushJsonToBeValid(result: PushResult): void {
    expect(result).to.have.property('pushedSource');
    expect(result.pushedSource, 'all push source to have expected keys').to.each.have.all.keys(
      'filePath',
      'fullName',
      'type',
      'state'
    );
  }

  /**
   * Expect source:pull json response to be valid
   */
  public pullJsonToBeValid(result: PullResult): void {
    expect(result).to.have.property('pulledSource');
    expect(result.pulledSource, 'all pulled source to have expected keys').to.each.have.all.keys(
      'filePath',
      'fullName',
      'type',
      'state'
    );
  }

  /**
   * Expect source:status json response to be valid
   */
  public statusJsonToBeValid(result: StatusResult): void {
    expect(result).to.each.have.all.keys('filePath', 'fullName', 'type', 'state');
  }

  /**
   * Expect source:convert json response to be valid
   */
  public convertJsonToBeValid(result: ConvertResult): void {
    expect(result).to.have.property('location');
    expect(result.location).to.be.a('string');
  }

  /**
   * Expect json to have given error name
   */
  public errorToHaveName(result: JsonMap, name: string): void {
    expect(result).to.have.property('name');
    expect(result.name, `error name to equal ${name}`).to.equal(name);
  }

  /**
   * Expect result to have given property
   */
  public toHaveProperty(result: JsonMap, prop: string): void {
    expect(result).to.have.property(prop);
  }

  /**
   * Expect result to have given property and for that property to equal the given value
   */
  public toHavePropertyAndValue(result: JsonMap, prop: string, value: unknown): void {
    expect(result).to.have.property(prop);
    expect(result[prop], `${prop} to have value ${value.toString()}`).to.equal(value);
  }

  /**
   * Expect result to have given property and for that property to NOT equal the given value
   */
  public toHavePropertyAndNotValue(result: JsonMap, prop: string, value: unknown): void {
    expect(result).to.have.property(prop);
    expect(result[prop], `${prop} to have value that does not equal ${value.toString()}`).to.not.equal(value);
  }

  /**
   * Expect all files in all packages to be found in the source:push json response
   */
  public async allMetaXmlsToBePushed(result: PushResult): Promise<void> {
    await this.allMetaXmlsToBePresent(result.pushedSource, this.packagePaths);
  }

  /**
   * Expect all files in all packages to be found in the source:pull json response
   */
  public async allMetaXmlsToBePulled(result: PullResult): Promise<void> {
    await this.allMetaXmlsToBePresent(result.pulledSource, this.packagePaths);
  }

  /**
   * Expect all files in given directories to be found in the source:deploy json response
   */
  public async allMetaXmlsToBeDeployed(result: SimpleDeployResult, ...directories: string[]): Promise<void> {
    await this.allMetaXmlsToBePresent(result.deployedSource, directories);
  }

  /**
   * Expect all files in given directories to be found in the source:retrieve json response
   */
  public async allMetaXmlsToBeRetrieved(result: RetrieveResult, ...directories: string[]): Promise<void> {
    await this.allMetaXmlsToBePresent(result.inboundFiles, directories);
  }

  /**
   * Expect all files in given directories to be found in the json response
   */
  private async allMetaXmlsToBePresent(results: SourceInfo[], directories: string[]): Promise<void> {
    const expectedFileCount = await countFiles(directories, /-meta.xml$/);
    const actualFileCount = results.filter((d) => d.filePath.endsWith('-meta.xml')).length;
    expect(actualFileCount, 'all meta.xml files to be present in json response').to.equal(expectedFileCount);
  }

  private async filesToBePresent(results: SourceInfo[], globs: string[]): Promise<void> {
    const filesToExpect: string[] = [];
    for (const glob of globs) {
      const fullGlob = [this.projectDir, glob].join('/');
      const globResults = await fg(fullGlob);
      filesToExpect.push(...globResults);
    }

    const truncatedFilesToExpect = filesToExpect.map((f) => f.replace(`${this.projectDir}${path.sep}`, ''));
    const actualFiles = results.map((d) => d.filePath);

    const everyExpectedFileFound = truncatedFilesToExpect.every((f) => actualFiles.includes(f));
    expect(truncatedFilesToExpect.length).to.be.greaterThan(0);
    expect(everyExpectedFileFound, 'All expected files to be present in the response').to.be.true;
  }

  private async filesToNotBePresent(results: SourceInfo[], globs: string[]): Promise<void> {
    const filesYouDontWantFound: string[] = [];
    for (const glob of globs) {
      const fullGlob = [this.projectDir, glob].join('/');
      const globResults = await fg(fullGlob);
      filesYouDontWantFound.push(...globResults);
    }

    const truncated = filesYouDontWantFound.map((f) => f.replace(`${this.projectDir}${path.sep}`, ''));
    const actualFiles = results.map((d) => d.filePath);

    const everyFileNotFound = truncated.every((f) => !actualFiles.includes(f));
    expect(truncated.length).to.be.greaterThan(0);
    expect(everyFileNotFound, 'All files to NOT be present in the response').to.be.true;
  }
}
