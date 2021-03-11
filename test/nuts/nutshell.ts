/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/* eslint-disable no-console */

import * as path from 'path';
import * as os from 'os';
import { copyFile } from 'fs/promises';
import { exec } from 'shelljs';
import { TestSession, execCmd } from '@salesforce/cli-plugins-testkit';
import { Env } from '@salesforce/kit';
import { AnyJson, ensureString, Nullable } from '@salesforce/ts-types';
import { AuthInfo, Connection, fs, NamedPackageDir, SfdxProject } from '@salesforce/core';
import { AsyncCreatable } from '@salesforce/kit';
import { debug, Debugger } from 'debug';
import {
  ConvertResult,
  DeployCancelResult,
  DeployReportResult,
  PullResult,
  PushResult,
  Result,
  RetrieveResult,
  SimpleDeployResult,
  StatusResult,
} from './types';
import { Assertions } from './assertions';
import { FileTracker, traverseForFiles } from './fileTracker';

/**
 * Nutshell is a class that is designed to make composing source nuts easy and painless
 *
 * It provides the following functionality:
 * 1. Methods that wrap around source commands, e.g. Nutshell.deploy wraps around force:source:deploy
 * 2. Access to commonly used assertions (provided by the Assertions class)
 * 3. Ability to track file history (provided by the FileTracker class)
 * 4. Ability to modify remote metadata
 * 5. Ability to add local metadata
 * 6. Miscellaneous helper methods
 *
 * To see debug logs for command executions set these env vars:
 * - DEBUG=nutshell:* (for logs from all nuts)
 * - DEBUG=nutshell:<filename.nut.ts> (for logs from specific nut)
 * - DEBUG_DEPTH=8
 */
export class Nutshell extends AsyncCreatable<Nutshell.Options> {
  public static Env = new Env();
  private static DefaultCmdOpts: Nutshell.CommandOpts = {
    exitCode: 0,
    args: '',
  };

  public packages: NamedPackageDir[];
  public packageNames: string[];
  public packagePaths: string[];
  public expect: Assertions;
  public testMetadataFolder: string;
  public testMetadataFiles: string[];

  private connection: Nullable<Connection>;
  private debug: Debugger;
  private executable: Nullable<string>;
  private fileTracker: FileTracker;
  private repository: string;
  private session: TestSession;
  private username: string;
  private orgless: boolean;

  public constructor(options: Nutshell.Options) {
    super(options);
    this.executable = options.executable;
    this.repository = options.repository;
    this.orgless = options.orgless;
    this.debug = debug(`nutshell:${path.basename(options.context)}`);
  }

  /**
   * Cleans the test session
   */
  public async clean(): Promise<void> {
    Nutshell.Env.unset('TESTKIT_EXECUTABLE_PATH');
    await this.session?.clean();
  }

  /**
   * Executes force:source:convert
   */
  public async convert(options: Partial<Nutshell.CommandOpts> = {}): Promise<Result<ConvertResult>> {
    return this.execute<ConvertResult>('force:source:convert', options);
  }

  /**
   * Executes force:source:deploy
   *
   * We allow a type parameter here because different flags produce completely
   * different json. We could utilize function overloads to make the typing
   * automatic but that would require typing all the different flags which
   * is something we'd rather not do.
   */
  public async deploy<T = SimpleDeployResult>(options: Partial<Nutshell.CommandOpts> = {}): Promise<Result<T>> {
    return this.execute<T>('force:source:deploy', options);
  }

  /**
   * Executes force:source:deploy:report
   */
  public async deployReport(options: Partial<Nutshell.CommandOpts> = {}): Promise<Result<DeployReportResult>> {
    return this.execute<DeployReportResult>('force:source:deploy:report', options);
  }

  /**
   * Executes force:source:deploy:cancel
   */
  public async deployCancel(options: Partial<Nutshell.CommandOpts> = {}): Promise<Result<DeployCancelResult>> {
    return this.execute<DeployCancelResult>('force:source:deploy:cancel', options);
  }

  /**
   * Executes force:source:retrieve
   */
  public async retrieve(options: Partial<Nutshell.CommandOpts> = {}): Promise<Result<RetrieveResult>> {
    return this.execute<RetrieveResult>('force:source:retrieve', options);
  }

  /**
   * Executes force:source:push
   */
  public async push(options: Partial<Nutshell.CommandOpts> = {}): Promise<Result<PushResult>> {
    return this.execute<PushResult>('force:source:push', options);
  }

  /**
   * Executes force:source:pull
   */
  public async pull(options: Partial<Nutshell.CommandOpts> = {}): Promise<Result<PullResult>> {
    return this.execute<PullResult>('force:source:pull', options);
  }

  /**
   * Executes force:source:status
   */
  public async status(options: Partial<Nutshell.CommandOpts> = {}): Promise<Result<StatusResult>> {
    return this.execute<StatusResult>('force:source:status', options);
  }

  /**
   * Installs a package into the scratch org. This method uses shelljs instead of testkit because
   * we can't add plugin-package as a dev plugin yet.
   */
  public installPackage(id: string): void {
    exec(`sfdx force:package:install --package ${id} --wait 5 --json 2> /dev/null`, { silent: true });
  }

  /**
   * Adds given files to FileTracker for tracking
   */
  public async trackFile(...files: string[]): Promise<void> {
    for (const file of files) {
      await this.fileTracker.track(file);
    }
  }

  /**
   * Read the org's sourcePathInfos.json
   */
  public async readSourcePathInfos(): Promise<AnyJson> {
    const sourcePathInfosPath = path.join(
      this.session.project.dir,
      '.sfdx',
      'orgs',
      this.username,
      'sourcePathInfos.json'
    );
    return fs.readJson(sourcePathInfosPath);
  }

  /**
   * Read the org's maxRevision.json
   */
  public async readMaxRevision(): Promise<AnyJson> {
    const maxRevisionPath = path.join(this.session.project.dir, '.sfdx', 'orgs', this.username, 'maxRevision.json');
    return fs.readJson(maxRevisionPath);
  }

  /**
   * Delete the org's sourcePathInfos.json
   */
  public async deleteSourcePathInfos(): Promise<void> {
    const sourcePathInfosPath = path.join(
      this.session.project.dir,
      '.sfdx',
      'orgs',
      this.username,
      'sourcePathInfos.json'
    );
    return fs.unlink(sourcePathInfosPath);
  }

  /**
   * Delete the org's maxRevision.json
   */
  public async deleteMaxRevision(): Promise<void> {
    const maxRevisionPath = path.join(this.session.project.dir, '.sfdx', 'orgs', this.username, 'maxRevision.json');
    return fs.unlink(maxRevisionPath);
  }

  /**
   * Delete all source files in the project directory
   */
  public async deleteAllSourceFiles(): Promise<void> {
    for (const pkg of this.packagePaths) {
      await fs.rmdir(pkg, { recursive: true });
      await fs.mkdirp(pkg);
    }
  }

  /**
   * Modify given files by inserting a new line at the end of the file
   */
  public async modifyLocalFiles(...files: string[]): Promise<void> {
    for (const file of files) {
      const filePath = path.join(this.session.project.dir, file);
      let contents = await fs.readFile(filePath, 'UTF-8');
      contents += os.EOL;
      await fs.writeFile(filePath, contents);
      await this.fileTracker.update(file, 'modified file');
    }
  }

  /**
   * Modify a remote file
   *
   * This presumes that there is a QuickAction called NutAction in
   * the test metadata. Ideally this method would be able to update
   * any metadata type with any name
   */
  public async modifyRemoteFile(): Promise<string> {
    const result: Array<{ Id: string }> = await this.connection?.tooling
      .sobject('QuickActionDefinition')
      .find({ DeveloperName: 'NutAction' }, ['ID']);
    const updateRequest = {
      Id: result[0].Id,
      Description: 'updated description',
    };
    await this.connection?.tooling.sobject('QuickActionDefinition').update(updateRequest);
    return this.testMetadataFiles.find((f) => f.endsWith('NutAction.quickAction-meta.xml'));
  }

  /**
   * Adds test files (located in the test/nuts/metadata folder) to the project directory
   */
  public async addTestFiles(): Promise<void> {
    for (const file of this.testMetadataFiles) {
      const dest = path.join(this.session.project.dir, file);
      const src = path.join(this.testMetadataFolder, file);
      this.debug(`addTestFiles: ${src} -> ${dest}`);
      try {
        await copyFile(src, dest);
      } catch {
        await fs.mkdirp(path.dirname(dest));
        await copyFile(src, dest);
      } finally {
        await this.trackFile(file);
      }
    }
  }

  protected async init(): Promise<void> {
    if (!Nutshell.Env.getString('TESTKIT_HUB_USERNAME')) {
      ensureString(Nutshell.Env.getString('TESTKIT_JWT_KEY'));
      ensureString(Nutshell.Env.getString('TESTKIT_JWT_CLIENT_ID'));
      ensureString(Nutshell.Env.getString('TESTKIT_HUB_INSTANCE'));
    }
    if (this.executable) {
      Nutshell.Env.setString('TESTKIT_EXECUTABLE_PATH', this.executable);
    }
    try {
      this.session = await this.createSession();
      const sfdxProject = await SfdxProject.resolve(this.session.project.dir);
      this.packages = sfdxProject.getPackageDirectories();
      this.packageNames = this.packages.map((p) => p.name);
      this.packagePaths = this.packages.map((p) => p.fullPath);
      this.fileTracker = new FileTracker(this.session.project.dir);
      this.expect = new Assertions(this.session.project.dir, this.fileTracker, this.packagePaths);
      this.username = this.getDefaultUsername();
      this.connection = await this.createConnection();
      this.testMetadataFolder = path.join(__dirname, 'metadata');
      this.testMetadataFiles = (await traverseForFiles(this.testMetadataFolder))
        .filter((f) => !f.endsWith('.DS_Store'))
        .map((f) => f.replace(`${this.testMetadataFolder}${path.sep}`, ''));
    } catch (err) {
      await this.handleError(err, true);
    }
  }

  /**
   * Execute a command using testkit. Adds --json to every command to ensure json output.
   */
  private async execute<T = AnyJson>(cmd: string, options: Partial<Nutshell.CommandOpts> = {}): Promise<Result<T>> {
    try {
      const { args, exitCode } = Object.assign({}, Nutshell.DefaultCmdOpts, options);
      const command = [cmd, args, '--json'].join(' ');
      this.debug(`${command} (expecting exit code: ${exitCode})`);
      await this.fileTracker.updateAll(`PRE: ${command}`);
      const result = execCmd<T>(command, { ensureExitCode: exitCode });
      await this.fileTracker.updateAll(`POST: ${command}`);

      const json = result.jsonOutput;
      this.debug('%O', json);
      if (!json) {
        console.error(`${command} returned null jsonOutput`);
        console.error(result);
      }
      this.expect.toHaveProperty(json, 'status');
      if (json.status === 0) {
        this.expect.toHaveProperty(json, 'result');
      }
      return json;
    } catch (err) {
      await this.handleError(err);
    }
  }

  /**
   * Log error to console with helpful debugging information
   */
  private async handleError(err: Error, clean = false): Promise<never> {
    const header = `  ENCOUNTERED ERROR IN: ${this.debug.namespace}  `;
    const orgs = execCmd<{ nonScratchOrgs: AnyJson; scratchOrgs: AnyJson }>('force:org:list --all --json');
    const auth = execCmd('auth:list --json');
    const config = execCmd('config:list --json');
    console.log('-'.repeat(header.length));
    console.log(header);
    console.log('-'.repeat(header.length));
    console.log(err);
    console.log('session:', this.session?.dir);
    console.log('username:', this.username);
    console.log('orgs:', orgs.jsonOutput.result.nonScratchOrgs);
    console.log('scratch orgs:', orgs.jsonOutput.result.scratchOrgs);
    console.log('auths:', auth.jsonOutput.result);
    console.log('config:', config.jsonOutput.result);
    console.log('-'.repeat(header.length));
    if (clean) await this.clean();
    throw err;
  }

  private async createSession(): Promise<TestSession> {
    const setupCommands = this.orgless
      ? []
      : [
          // TODO: remove this config:set call
          'sfdx config:set apiVersion=50.0 --global',
          'sfdx force:org:create -d 1 -s -f config/project-scratch-def.json',
        ];
    return TestSession.create({
      project: { gitClone: this.repository },
      setupCommands,
    });
  }

  private getDefaultUsername(): string {
    const result = execCmd<Array<{ key: string; value: string }>>('config:get defaultusername --json').jsonOutput
      .result;
    return result.find((r) => r.key === 'defaultusername')?.value;
  }

  private async createConnection(): Promise<Nullable<Connection>> {
    if (this.orgless) return;
    return await Connection.create({
      authInfo: await AuthInfo.create({ username: this.username }),
    });
  }
}

export namespace Nutshell {
  export type Options = {
    readonly executable?: string;
    readonly repository: string;
    readonly context: string;
    readonly orgless?: boolean;
  };

  export type CommandOpts = {
    exitCode: number;
    args: string;
  };
}
