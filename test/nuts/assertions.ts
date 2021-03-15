/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import { expect, use } from 'chai';
import * as chaiEach from 'chai-each';
import { findKey } from '@salesforce/kit';
import { JsonMap } from '@salesforce/ts-types';
import * as fg from 'fast-glob';
import { Connection, fs } from '@salesforce/core';
import { MetadataResolver } from '@salesforce/source-deploy-retrieve';
import { debug, Debugger } from 'debug';
import { PullResult, RetrieveResult, SourceInfo, SourceState, StatusResult } from './types';
import { ExecutionLog } from './executionLog';
import { FileTracker, countFiles } from './fileTracker';

use(chaiEach);

type SObjectRecord = {
  attributes: {
    type: string;
    url: string;
  };
  Id: string;
  LastModifiedDate: string;
};

type ApexTestResult = {
  TestTimestamp: string;
  ApexClassId: string;
};

type ApexClass = {
  Id: string;
  Name: string;
};

export class Assertions {
  private debug: Debugger;
  private metadataResolver: MetadataResolver;

  public constructor(
    private projectDir: string,
    private fileTracker: FileTracker,
    private packagePaths: string[],
    private connection: Connection,
    private executionLog: ExecutionLog
  ) {
    this.debug = debug('assertions');
    this.metadataResolver = new MetadataResolver();
  }

  /**
   * Expect given file to be changed according to the file history provided by FileTracker
   */
  public fileToBeChanged(file: string): void {
    const fileHistory = this.fileTracker.get(file);
    expect(fileHistory[fileHistory.length - 1].changedFromPrevious, 'File to be changed').to.be.true;
  }

  /**
   * Finds all files in project based on the provided globs and expects them to be updated on the server
   */
  public async filesToBeDeployed(globs: string[], deployCommand = 'force:source:deploy'): Promise<void> {
    await this.filesToBeUpdated(globs, deployCommand);
  }

  /**
   * Finds all files in project based on the provided globs and expects them to NOT be updated on the server
   */
  public async filesToNotBeDeployed(globs: string[], deployCommand = 'force:source:deploy'): Promise<void> {
    await this.filesToNotBeUpdated(globs, deployCommand);
  }

  /**
   * Finds all files in project based on the provided globs and expects SOME of them to NOT be updated on the server.
   * This is helpful for testing force:source:deploy:cancel where we can know beforehand which files will be deployed.
   */
  public async someFilesToNotBeDeployed(globs: string[], deployCommand = 'force:source:deploy'): Promise<void> {
    await this.someFilesToNotBeUpdated(globs, deployCommand);
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
    const fullPath = file.startsWith(this.projectDir) ? file : path.join(this.projectDir, file);
    const fileExists = await fs.fileExists(fullPath);
    expect(fileExists, `${fullPath} to exist`).to.be.true;
  }

  /**
   * Expects files to exist in convert output directory
   */
  public async filesToBeConverted(directory: string, globs: string[]): Promise<void> {
    const convertedFiles: string[] = [];
    for (const glob of globs) {
      const fullGlob = [directory, glob].join('/');
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
  public async fileToBePushed(file: string): Promise<void> {
    await this.filesToBeUpdated([file], 'force:source:push');
  }

  /**
   * Expect all given files to be be updated in the org
   */
  public async filesToBePushed(globs: string[]): Promise<void> {
    await this.filesToBeUpdated(globs, 'force:source:push');
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
   * Expect json to have given error name
   */
  public errorToHaveName(result: JsonMap, name: string): void {
    expect(result).to.have.property('name');
    expect(result.name, `error name to equal ${name}`).to.equal(name);
  }

  public async noApexTestsToBeRun(): Promise<void> {
    const executionTimestamp = this.executionLog.getLatestTimestamp('force:source:deploy');
    const testResults = await this.retrieveApexTestResults();
    const testsRunAfterTimestamp = testResults.filter((r) => new Date(r.TestTimestamp) > executionTimestamp);
    expect(testsRunAfterTimestamp.length, 'no tests to be run during deploy').to.equal(0);
  }

  public async apexTestsToBeRun(): Promise<void> {
    const executionTimestamp = this.executionLog.getLatestTimestamp('force:source:deploy');
    const testResults = await this.retrieveApexTestResults();
    const testsRunAfterTimestamp = testResults.filter((r) => new Date(r.TestTimestamp) > executionTimestamp);
    expect(testsRunAfterTimestamp.length, 'tests to be run during deploy').to.be.greaterThan(0);
  }

  public async specificApexTestsToBeRun(classNames: string[]): Promise<void> {
    const apexClasses = await this.retrieveApexClasses(classNames);
    const classIds = apexClasses.map((c) => c.Id);
    const executionTimestamp = this.executionLog.getLatestTimestamp('force:source:deploy');
    const testResults = await this.retrieveApexTestResults();
    const testsRunAfterTimestamp = testResults.filter((r) => {
      return new Date(r.TestTimestamp) > executionTimestamp && classIds.includes(r.ApexClassId);
    });

    expect(testsRunAfterTimestamp.length, 'tests to be run during deploy').to.be.greaterThan(0);
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
   * Expect all files in all packages to be found in the source:pull json response
   */
  public async allMetaXmlsToBePulled(result: PullResult): Promise<void> {
    await this.allMetaXmlsToBePresent(result.pulledSource, this.packagePaths);
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

  private async filesToBeUpdated(globs: string[], command: string): Promise<void> {
    const executionTimestamp = this.executionLog.getLatestTimestamp(command);
    const assertionMessage = `expect all metadata to have LastModifiedDate later than ${executionTimestamp.toString()}`;
    this.debug(assertionMessage);

    const records = await this.retrieveSObjectsBasedOnGlobs(globs);
    this.debug('Found SObjects: %O', records);
    const allRecordsUpdated = records.every((record) => new Date(record.LastModifiedDate) > executionTimestamp);
    expect(allRecordsUpdated, assertionMessage).to.be.true;
  }

  private async filesToNotBeUpdated(globs: string[], command: string): Promise<void> {
    const executionTimestamp = this.executionLog.getLatestTimestamp(command);
    const assertionMessage = `expect all metadata to have LastModifiedDate earlier than ${executionTimestamp.toString()}`;
    this.debug(assertionMessage);

    const records = await this.retrieveSObjectsBasedOnGlobs(globs);
    this.debug('Found SObjects: %O', records);
    const allRecordsNotUpdated = records.every((record) => new Date(record.LastModifiedDate) < executionTimestamp);
    expect(allRecordsNotUpdated, assertionMessage).to.be.true;
  }

  private async someFilesToNotBeUpdated(globs: string[], command: string): Promise<void> {
    const executionTimestamp = this.executionLog.getLatestTimestamp(command);
    const assertionMessage = `expect all metadata to have LastModifiedDate earlier than ${executionTimestamp.toString()}`;
    this.debug(assertionMessage);

    const records = await this.retrieveSObjectsBasedOnGlobs(globs);
    this.debug('Found SObjects: %O', records);
    const allRecordsNotUpdated = records.some((record) => new Date(record['LastModifiedDate']) < executionTimestamp);
    expect(allRecordsNotUpdated, assertionMessage).to.be.true;
  }

  private async retrieveSObjectsBasedOnGlobs(globs: string[]): Promise<SObjectRecord[]> {
    // the LastModifiedDate field isn't always updated for CustomFields when its CustomObject
    // is deployed. So the sake of simplicity, we filter those out before checking that all
    // metadata has been updated by the deploy.
    const exceptions = ['CustomField'];
    const filesToExpect: string[] = [];
    for (const glob of globs) {
      const fullGlob = glob.includes(this.projectDir) ? glob : [this.projectDir, glob].join('/');
      this.debug(`Finding files using glob: ${fullGlob}`);
      const globResults = await fg(fullGlob);
      this.debug('Found: %O', globResults);
      filesToExpect.push(...globResults);
    }

    const cache = new Map<string, SObjectRecord[]>();
    const records = new Map<string, SObjectRecord>();

    for (const file of filesToExpect) {
      const components = this.metadataResolver.getComponentsFromPath(file);
      const metadataType = components[0].type.name;
      const metadataName = components[0].fullName;
      if (records.has(metadataName)) continue;
      if (!cache.has(metadataType)) {
        try {
          const describe = await this.connection.tooling.describe(metadataType);
          const fields = describe.fields.map((f) => f.name).join(',');
          const query = `SELECT ${fields} FROM ${components[0].type.name}`;
          const result = await this.connection.tooling.query<SObjectRecord>(query, {
            autoFetch: true,
            maxFetch: 50000,
          });
          cache.set(metadataType, result.records);
        } catch {
          // do nothing
        }
      }

      const recordsForType = cache.get(metadataType) || [];
      const match = recordsForType.find((record) => findKey(record, (v: string) => metadataName.includes(v)));
      if (match) records.set(metadataName, match);
    }
    return [...records.values()].filter((r) => !exceptions.includes(r.attributes.type));
  }

  private async retrieveApexTestResults(): Promise<ApexTestResult[]> {
    const query = 'SELECT TestTimestamp, ApexClassId FROM ApexTestResult';
    const result = await this.connection.tooling.query<ApexTestResult>(query, { autoFetch: true, maxFetch: 50000 });
    return result.records;
  }

  private async retrieveApexClasses(classNames?: string[]): Promise<ApexClass[]> {
    const query = 'SELECT Name,Id FROM ApexClass';
    const result = await this.connection.tooling.query<ApexClass>(query, { autoFetch: true, maxFetch: 50000 });
    const apexClasses = classNames ? result.records.filter((r) => classNames.includes(r.Name)) : result.records;
    return apexClasses;
  }
}
