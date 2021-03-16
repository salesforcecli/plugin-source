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
import { Connection, fs } from '@salesforce/core';
import { MetadataResolver } from '@salesforce/source-deploy-retrieve';
import { debug, Debugger } from 'debug';
import { ApexClass, ApexTestResult, Context, SourceMember, SourceState, StatusResult } from './types';
import { ExecutionLog } from './executionLog';
import { FileTracker, countFiles } from './fileTracker';

use(chaiEach);

/**
 * Assertions is a class that is designed to encapsulate common assertions we want to
 * make during NUT testings
 *
 * To see debug logs for command executions set these env vars:
 * - DEBUG=assertions:* (for logs from all nuts)
 * - DEBUG=assertions:<filename.nut.ts> (for logs from specific nut)
 */
export class Assertions {
  private debug: Debugger;
  private metadataResolver: MetadataResolver;
  private projectDir: string;
  private connection: Connection;

  public constructor(context: Context, private executionLog: ExecutionLog, private fileTracker: FileTracker) {
    this.projectDir = context.projectDir;
    this.connection = context.connection;
    this.debug = debug(`assertions:${context.nut}`);
    this.metadataResolver = new MetadataResolver();
  }

  /**
   * Expect given file to be changed according to the file history provided by FileTracker
   */
  public fileToBeChanged(file: string): void {
    const fileHistory = this.fileTracker.getLatest(file);
    expect(fileHistory.changedFromPrevious, 'File to be changed').to.be.true;
  }

  /**
   * Expect all files found by globs to be changed according to the file history provided by FileTracker
   */
  public async filesToBeChanged(globs: string[]): Promise<void> {
    const files = await this.doGlob(globs);
    const fileHistories = files.map((f) => this.fileTracker.getLatest(f).changedFromPrevious);
    const allChanged = fileHistories.every((f) => !!f);
    expect(allChanged, 'all files to be changed').to.be.true;
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
   * Expects given file to exist
   */
  public async fileToExist(file: string): Promise<void> {
    const fullPath = file.startsWith(this.projectDir) ? file : path.join(this.projectDir, file);
    const fileExists = await fs.fileExists(fullPath);
    expect(fileExists, `${fullPath} to exist`).to.be.true;
  }

  /**
   * Expects given globs to return files
   */
  public async filesToExist(globs: string[]): Promise<void> {
    for (const glob of globs) {
      const results = await this.doGlob([glob]);
      expect(results.length, `expect files to be found by glob: ${glob}`).to.be.greaterThan(0);
    }
  }

  /**
   * Expects files to exist in convert output directory
   */
  public async filesToBeConverted(directory: string, globs: string[]): Promise<void> {
    const fullGlobs = globs.map((glob) => [directory, glob].join('/'));
    const convertedFiles = await fg(fullGlobs);
    expect(convertedFiles.length, 'files to be converted').to.be.greaterThan(0);
  }

  /**
   * Expect the retrieved package to exist and contain some files
   */
  public async packagesToBeRetrieved(pkgNames: string[]): Promise<void> {
    for (const pkgName of pkgNames) {
      await this.fileToExist(pkgName);
      await this.directoryToHaveSomeFiles(pkgName);
    }
  }

  /**
   * Expect all given files to be be updated in the org
   */
  public async filesToBePushed(globs: string[]): Promise<void> {
    await this.filesToBeUpdated(globs, 'force:source:push');
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
   * Expect json to have given error name
   */
  public errorToHaveName(result: JsonMap, name: string): void {
    expect(result).to.have.property('name');
    expect(result.name, `error name to equal ${name}`).to.equal(name);
  }

  /**
   * Expect no apex tests to be run
   */
  public async noApexTestsToBeRun(): Promise<void> {
    const executionTimestamp = this.executionLog.getLatestTimestamp('force:source:deploy');
    const testResults = await this.retrieveApexTestResults();
    const testsRunAfterTimestamp = testResults.filter((r) => new Date(r.TestTimestamp) > executionTimestamp);
    expect(testsRunAfterTimestamp.length, 'no tests to be run during deploy').to.equal(0);
  }

  /**
   * Expect some apex tests to be run
   */
  public async apexTestsToBeRun(): Promise<void> {
    const executionTimestamp = this.executionLog.getLatestTimestamp('force:source:deploy');
    const testResults = await this.retrieveApexTestResults();
    const testsRunAfterTimestamp = testResults.filter((r) => new Date(r.TestTimestamp) > executionTimestamp);
    expect(testsRunAfterTimestamp.length, 'tests to be run during deploy').to.be.greaterThan(0);
  }

  /**
   * Expect apex tests owned by the provided classes to be run
   */
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

  private async filesToBeUpdated(globs: string[], command: string): Promise<void> {
    const { sourceMembers } = this.executionLog.getLatest(command);
    const latestSourceMembers = await this.retrieveSourceMembers(globs);

    for (const sourceMember of latestSourceMembers) {
      const assertionMessage = `expect RevisionCounter for ${sourceMember.MemberName} (${sourceMember.MemberType}) to be incremented`;
      const preCommandExecution = sourceMembers.find(
        (s) => s.MemberType === sourceMember.MemberType && s.MemberName === sourceMember.MemberName
      ) || { RevisionCounter: 0 };
      expect(sourceMember.RevisionCounter, assertionMessage).to.be.greaterThan(preCommandExecution.RevisionCounter);
    }
  }

  private async filesToNotBeUpdated(globs: string[], command: string): Promise<void> {
    const { sourceMembers } = this.executionLog.getLatest(command);
    const latestSourceMembers = await this.retrieveSourceMembers(globs);
    if (!latestSourceMembers.length) {
      // Not finding any source members based on the globs means that there is no SourceMember for those files
      // which we're assuming means that it hasn't been deployed to the org yet.
      // That's acceptable for this test since we're testing that metadata hasn't been deployed.
      expect(latestSourceMembers.length).to.equal(0);
    } else {
      for (const sourceMember of latestSourceMembers) {
        const assertionMessage = `expect RevisionCounter for ${sourceMember.MemberName} (${sourceMember.MemberType}) to NOT be incremented`;
        const preCommandExecution = sourceMembers.find(
          (s) => s.MemberType === sourceMember.MemberType && s.MemberName === sourceMember.MemberName
        ) || { RevisionCounter: 0 };
        expect(sourceMember.RevisionCounter, assertionMessage).to.equal(preCommandExecution.RevisionCounter);
      }
    }
  }

  private async someFilesToNotBeUpdated(globs: string[], command: string): Promise<void> {
    const { sourceMembers } = this.executionLog.getLatest(command);
    const latestSourceMembers = await this.retrieveSourceMembers(globs);
    const someAreNotUpdated = latestSourceMembers.some((sourceMember) => {
      const preCommandExecution = sourceMembers.find(
        (s) => s.MemberType === sourceMember.MemberType && s.MemberName === sourceMember.MemberName
      ) || { RevisionCounter: 0 };
      return sourceMember.RevisionCounter === preCommandExecution.RevisionCounter;
    });
    expect(someAreNotUpdated, 'expect some SourceMembers to not be updated').to.be.true;
  }

  private async retrieveSourceMembers(globs: string[]): Promise<SourceMember[]> {
    const query = 'SELECT Id,MemberName,MemberType,RevisionCounter FROM SourceMember';
    const result = await this.connection.tooling.query<SourceMember>(query, {
      autoFetch: true,
      maxFetch: 50000,
    });
    const filesToExpect = await this.doGlob(globs);
    const membersMap = new Map<string, Set<string>>();
    for (const file of filesToExpect) {
      const components = this.metadataResolver.getComponentsFromPath(file);
      for (const component of components) {
        const metadataType = component.type.name;
        const metadataName = component.fullName;
        if (membersMap.has(metadataType)) {
          const updated = membersMap.get(metadataType).add(metadataName);
          membersMap.set(metadataType, updated);
        } else {
          membersMap.set(metadataType, new Set([metadataName]));
        }
      }
    }
    return result.records.filter((sourceMember) => {
      return (
        membersMap.has(sourceMember.MemberType) && membersMap.get(sourceMember.MemberType).has(sourceMember.MemberName)
      );
    });
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

  private async doGlob(globs: string[]): Promise<string[]> {
    const files: string[] = [];
    for (const glob of globs) {
      const fullGlob = glob.startsWith(this.projectDir) ? glob : [this.projectDir, glob].join('/');
      this.debug(`Finding files using glob: ${fullGlob}`);
      const globResults = await fg(fullGlob);
      this.debug('Found: %O', globResults);
      files.push(...globResults);
    }
    expect(files.length, 'globs to return files').to.be.greaterThan(0);
    return files;
  }
}
