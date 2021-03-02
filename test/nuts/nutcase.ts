/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import * as os from 'os';
import { copyFile } from 'fs/promises';
import { TestSession, execCmd } from '@salesforce/cli-plugins-testkit';
import { Env } from '@salesforce/kit';
import { AnyJson, JsonMap, ensureString } from '@salesforce/ts-types';
import { AuthInfo, ConfigAggregator, Connection, fs, NamedPackageDir, SfdxProject } from '@salesforce/core';
import { AsyncCreatable } from '@salesforce/kit';
import { debug, Debugger } from 'debug';
import { DeployResult, PullResult, PushResult, RetrieveResult, StatusResult } from '../../src/sourceCommand';
import { Expectations, traverseForFiles } from './expectations';
import { FileTracker } from './fileTracker';

export class Nutcase extends AsyncCreatable<Nutcase.Options> {
  public static Env = new Env();
  private static DefaultCmdOpts: Nutcase.CommandOpts = {
    exitCode: 0,
    args: '',
  };

  public packages: NamedPackageDir[];
  public packageNames: string[];
  public packagePaths: string[];
  public expect: Expectations;
  public testMetadataFolder: string;
  public testMetadataFiles: string[];

  private configAggregator: ConfigAggregator;
  private connection: Connection;
  private debug: Debugger;
  private executable?: string;
  private fileTracker: FileTracker;
  private repository: string;
  private session: TestSession;
  private username: string;

  public constructor(options: Nutcase.Options) {
    super(options);
    this.debug = debug('nutcase');
    this.executable = options.executable;
    this.repository = options.repository;
  }

  public async clean(): Promise<void> {
    Nutcase.Env.unset('TESTKIT_EXECUTABLE_PATH');
    await this.session?.clean();
  }

  public async deploy(options: Partial<Nutcase.CommandOpts> = {}): Promise<Nutcase.CmdResult<DeployResult>> {
    return this.execute<DeployResult>('force:source:deploy', options);
  }

  public async retrieve(options: Partial<Nutcase.CommandOpts> = {}): Promise<Nutcase.CmdResult<RetrieveResult>> {
    return this.execute<RetrieveResult>('force:source:retrieve', options);
  }

  public async push(options: Partial<Nutcase.CommandOpts> = {}): Promise<Nutcase.CmdResult<PushResult>> {
    return this.execute<PushResult>('force:source:push', options);
  }

  public async pull(options: Partial<Nutcase.CommandOpts> = {}): Promise<Nutcase.CmdResult<PullResult>> {
    return this.execute<PullResult>('force:source:pull', options);
  }

  public async status(options: Partial<Nutcase.CommandOpts> = {}): Promise<Nutcase.CmdResult<StatusResult>> {
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
    if (!Nutcase.Env.getString('TESTKIT_HUB_USERNAME')) {
      ensureString(Nutcase.Env.getString('TESTKIT_JWT_KEY'));
      ensureString(Nutcase.Env.getString('TESTKIT_JWT_CLIENT_ID'));
      ensureString(Nutcase.Env.getString('TESTKIT_HUB_INSTANCE'));
    }
    if (this.executable) {
      Nutcase.Env.setString('TESTKIT_EXECUTABLE_PATH', this.executable);
    }

    this.session = await this.createSession();
    const sfdxProject = await SfdxProject.resolve(this.session.project.dir);
    this.packages = sfdxProject.getPackageDirectories();
    this.packageNames = this.packages.map((p) => p.name);
    this.packagePaths = this.packages.map((p) => p.fullPath);
    this.fileTracker = new FileTracker(this.session.project.dir);
    this.expect = new Expectations(this.session.project.dir, this.fileTracker, this.packagePaths);
    this.configAggregator = await ConfigAggregator.create();
    this.username =
      (this.configAggregator.getPropertyValue('defaultusername') as string) ||
      Nutcase.Env.getString('TESTKIT_ORG_USERNAME');
    this.connection = await Connection.create({
      authInfo: await AuthInfo.create({ username: this.username }),
    });
    this.testMetadataFolder = path.join(__dirname, 'metadata');
    this.testMetadataFiles = (await traverseForFiles(this.testMetadataFolder))
      .filter((f) => !f.endsWith('.DS_Store'))
      .map((f) => f.replace(`${this.testMetadataFolder}${path.sep}`, ''));
  }

  private async execute<T = AnyJson>(
    cmd: string,
    options: Partial<Nutcase.CommandOpts> = {}
  ): Promise<Nutcase.CmdResult<T>> {
    const { args, exitCode } = Object.assign({}, Nutcase.DefaultCmdOpts, options);
    const command = [cmd, args, '--json'].join(' ');
    this.debug(`${command} (expecting exit code: ${exitCode})`);
    await this.fileTracker.updateAll(`PRE: ${command}`);
    const result = execCmd<T>(command, { ensureExitCode: exitCode }).jsonOutput;
    this.debug('%O', result);
    await this.fileTracker.updateAll(`POST: ${command}`);
    return result;
  }

  private async createSession(): Promise<TestSession> {
    return TestSession.create({
      project: { gitClone: this.repository },
      setupCommands: [
        'sfdx config:set apiVersion=50.0 --global',
        'sfdx force:org:create -d 1 -s -f config/project-scratch-def.json',
      ],
    });
  }
}

export namespace Nutcase {
  export type Options = {
    readonly executable?: string;
    readonly repository: string;
  };

  export type CommandOpts = {
    exitCode: number;
    args: string;
  };

  export type CmdResult<T> = JsonMap & {
    status: number;
    result: T;
  };
}
