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
import { Expectations, traverseForFiles } from './expectations';
import { FileTracker } from './fileTracker';

export class Nutshell extends AsyncCreatable<Nutshell.Options> {
  public static Env = new Env();
  private static DefaultCmdOpts: Nutshell.CommandOpts = {
    exitCode: 0,
    args: '',
  };

  public packages: NamedPackageDir[];
  public packageNames: string[];
  public packagePaths: string[];
  public expect: Expectations;
  public testMetadataFolder: string;
  public testMetadataFiles: string[];

  private connection: Connection;
  private debug: Debugger;
  private executable: Nullable<string>;
  private fileTracker: FileTracker;
  private repository: string;
  private session: TestSession;
  private username: string;

  public constructor(options: Nutshell.Options) {
    super(options);
    this.executable = options.executable;
    this.repository = options.repository;
    this.debug = debug(`nutshell:${path.basename(options.context)}`);
  }

  public async clean(): Promise<void> {
    Nutshell.Env.unset('TESTKIT_EXECUTABLE_PATH');
    await this.session?.clean();
  }

  public async convert(options: Partial<Nutshell.CommandOpts> = {}): Promise<Result<ConvertResult>> {
    return this.execute<ConvertResult>('force:source:convert', options);
  }

  // We allow a type parameter here because different flags produce completely
  // different json. We could utilize function overloads to make the typing
  // automatic but that would require typing all the different flags which
  // is something we'd rather not do.
  public async deploy<T = SimpleDeployResult>(options: Partial<Nutshell.CommandOpts> = {}): Promise<Result<T>> {
    return this.execute<T>('force:source:deploy', options);
  }

  public async deployReport(options: Partial<Nutshell.CommandOpts> = {}): Promise<Result<DeployReportResult>> {
    return this.execute<DeployReportResult>('force:source:deploy:report', options);
  }

  public async deployCancel(options: Partial<Nutshell.CommandOpts> = {}): Promise<Result<DeployCancelResult>> {
    return this.execute<DeployCancelResult>('force:source:deploy:cancel', options);
  }

  public async retrieve(options: Partial<Nutshell.CommandOpts> = {}): Promise<Result<RetrieveResult>> {
    return this.execute<RetrieveResult>('force:source:retrieve', options);
  }

  public async push(options: Partial<Nutshell.CommandOpts> = {}): Promise<Result<PushResult>> {
    return this.execute<PushResult>('force:source:push', options);
  }

  public async pull(options: Partial<Nutshell.CommandOpts> = {}): Promise<Result<PullResult>> {
    return this.execute<PullResult>('force:source:pull', options);
  }

  public async status(options: Partial<Nutshell.CommandOpts> = {}): Promise<Result<StatusResult>> {
    return this.execute<StatusResult>('force:source:status', options);
  }

  public async trackFile(...files: string[]): Promise<void> {
    for (const file of files) {
      await this.fileTracker.track(file);
    }
  }

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

  public async readMaxRevision(): Promise<AnyJson> {
    const maxRevisionPath = path.join(this.session.project.dir, '.sfdx', 'orgs', this.username, 'maxRevision.json');
    return fs.readJson(maxRevisionPath);
  }

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

  public async deleteMaxRevision(): Promise<void> {
    const maxRevisionPath = path.join(this.session.project.dir, '.sfdx', 'orgs', this.username, 'maxRevision.json');
    return fs.unlink(maxRevisionPath);
  }

  public async deleteAllSourceFiles(): Promise<void> {
    for (const pkg of this.packagePaths) {
      await fs.rmdir(pkg, { recursive: true });
      await fs.mkdirp(pkg);
    }
  }

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
   * This presumes that there is a QuickAction called NutAction in
   * the test metadata. Ideally this method would be able to update
   * any metadata type with any name
   */
  public async modifyRemoteFile(): Promise<string> {
    const result: Array<{ Id: string }> = await this.connection.tooling
      .sobject('QuickActionDefinition')
      .find({ DeveloperName: 'NutAction' }, ['ID']);
    const updateRequest = {
      Id: result[0].Id,
      Description: 'updated description',
    };
    await this.connection.tooling.sobject('QuickActionDefinition').update(updateRequest);
    return this.testMetadataFiles.find((f) => f.endsWith('NutAction.quickAction-meta.xml'));
  }

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
      // Is this going to be a problem when we start running both executables?
      Nutshell.Env.setString('TESTKIT_EXECUTABLE_PATH', this.executable);
    }
    try {
      this.session = await this.createSession();
      const sfdxProject = await SfdxProject.resolve(this.session.project.dir);
      this.packages = sfdxProject.getPackageDirectories();
      this.packageNames = this.packages.map((p) => p.name);
      this.packagePaths = this.packages.map((p) => p.fullPath);
      this.fileTracker = new FileTracker(this.session.project.dir);
      this.expect = new Expectations(this.session.project.dir, this.fileTracker, this.packagePaths);
      this.username = this.getDefaultUsername();
      this.connection = await Connection.create({
        authInfo: await AuthInfo.create({ username: this.username }),
      });
      this.testMetadataFolder = path.join(__dirname, 'metadata');
      this.testMetadataFiles = (await traverseForFiles(this.testMetadataFolder))
        .filter((f) => !f.endsWith('.DS_Store'))
        .map((f) => f.replace(`${this.testMetadataFolder}${path.sep}`, ''));
    } catch (err) {
      await this.handleError(err, true);
    }
  }

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

  private async handleError(err: Error, clean = false): Promise<never> {
    const header = `# ENCOUNTERED ERROR IN: ${this.debug.namespace}`;
    const orgs = execCmd('force:org:list --all --json');
    const auth = execCmd('auth:list --json');
    const config = execCmd('config:list --json');
    console.log('-'.repeat(header.length));
    console.log(header);
    console.log('-'.repeat(header.length));
    console.log(err);
    console.log('session:', this.session?.dir);
    console.log('username:', this.username);
    console.log('orgs:', orgs.jsonOutput);
    console.log('auths:', auth.jsonOutput);
    console.log('config:', config.jsonOutput);
    console.log('-'.repeat(header.length));
    if (clean) await this.clean();
    throw err;
  }

  private async createSession(): Promise<TestSession> {
    return TestSession.create({
      project: { gitClone: this.repository },
      setupCommands: [
        // TODO: remove this config:set call
        'sfdx config:set apiVersion=50.0 --global',
        'sfdx force:org:create -d 1 -s -f config/project-scratch-def.json',
      ],
    });
  }

  private getDefaultUsername(): string {
    const result = execCmd<Array<{ key: string; value: string }>>('config:get defaultusername --json').jsonOutput
      .result;
    return result.find((r) => r.key === 'defaultusername')?.value;
  }
}

export namespace Nutshell {
  export type Options = {
    readonly executable?: string;
    readonly repository: string;
    readonly context: string;
  };

  export type CommandOpts = {
    exitCode: number;
    args: string;
  };
}
