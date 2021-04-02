/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as os from 'os';
import * as path from 'path';
import { flags, FlagsConfig } from '@salesforce/command';
import { Lifecycle, Messages } from '@salesforce/core';
import { DeployResult } from '@salesforce/source-deploy-retrieve';
import { Duration } from '@salesforce/kit';
import { asString, asArray, getBoolean } from '@salesforce/ts-types';
import * as chalk from 'chalk';
import { SourceCommand } from '../../../sourceCommand';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'deploy');

export class Deploy extends SourceCommand {
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessage('examples').split(os.EOL);
  public static readonly requiresProject = true;
  public static readonly requiresUsername = true;
  public static readonly flagsConfig: FlagsConfig = {
    checkonly: flags.boolean({
      char: 'c',
      description: messages.getMessage('flags.checkonly'),
    }),
    wait: flags.minutes({
      char: 'w',
      default: Duration.minutes(SourceCommand.DEFAULT_SRC_WAIT_MINUTES),
      min: Duration.minutes(0), // wait=0 means deploy is asynchronous
      description: messages.getMessage('flags.wait'),
    }),
    testlevel: flags.enum({
      char: 'l',
      description: messages.getMessage('flags.testLevel'),
      options: ['NoTestRun', 'RunSpecifiedTests', 'RunLocalTests', 'RunAllTestsInOrg'],
      default: 'NoTestRun',
    }),
    runtests: flags.array({
      char: 'r',
      description: messages.getMessage('flags.runTests'),
      default: [],
    }),
    ignoreerrors: flags.boolean({
      char: 'o',
      description: messages.getMessage('flags.ignoreErrors'),
    }),
    ignorewarnings: flags.boolean({
      char: 'g',
      description: messages.getMessage('flags.ignoreWarnings'),
    }),
    validateddeployrequestid: flags.id({
      char: 'q',
      description: messages.getMessage('flags.validateDeployRequestId'),
      exclusive: [
        'manifest',
        'metadata',
        'sourcepath',
        'checkonly',
        'testlevel',
        'runtests',
        'ignoreerrors',
        'ignorewarnings',
      ],
    }),
    verbose: flags.builtin({
      description: messages.getMessage('flags.verbose'),
    }),
    metadata: flags.array({
      char: 'm',
      description: messages.getMessage('flags.metadata'),
      exclusive: ['manifest', 'sourcepath'],
    }),
    sourcepath: flags.array({
      char: 'p',
      description: messages.getMessage('flags.sourcePath'),
      exclusive: ['manifest', 'metadata'],
    }),
    manifest: flags.filepath({
      char: 'x',
      description: messages.getMessage('flags.manifest'),
      exclusive: ['metadata', 'sourcepath'],
    }),
  };
  protected readonly lifecycleEventNames = ['predeploy', 'postdeploy'];

  public async run(): Promise<DeployResult> {
    if (this.flags.validatedeployrequestid) {
      // TODO: return this.doDeployRecentValidation();
      throw Error('NOT IMPLEMENTED YET');
    }
    const hookEmitter = Lifecycle.getInstance();

    const cs = await this.createComponentSet({
      sourcepath: asArray<string>(this.flags.sourcepath),
      manifest: asString(this.flags.manifest),
      metadata: asArray<string>(this.flags.metadata),
      apiversion: asString(this.flags.apiversion),
    });

    await hookEmitter.emit('predeploy', { packageXmlPath: cs.getPackageXml() });

    const results = await cs
      .deploy({
        usernameOrConnection: this.org.getUsername(),
        apiOptions: {
          ignoreWarnings: getBoolean(this.flags, 'ignorewarnings', false),
          rollbackOnError: !getBoolean(this.flags, 'ignoreerrors', false),
          checkOnly: getBoolean(this.flags, 'checkonly', false),
          runTests: asArray<string>(this.flags.runtests),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          testLevel: this.flags.testlevel,
        },
      })
      .start();
    await hookEmitter.emit('postdeploy', results);

    // skip a lot of steps that would do nothing
    if (!this.flags.json) {
      this.print(results);
    }

    return results;
  }

  private printComponentFailures(result: DeployResult): void {
    if (result.response.status === 'Failed' && result.components) {
      // sort by filename then fullname
      const failures = result.getFileResponses().sort((i, j) => {
        if (i.filePath === j.filePath) {
          // if they have the same directoryName then sort by fullName
          return i.fullName < j.fullName ? 1 : -1;
        }
        return i.filePath < j.filePath ? 1 : -1;
      });
      this.ux.log('');
      this.ux.styledHeader(chalk.red(`Component Failures [${failures.length}]`));
      this.ux.table(failures, {
        columns: [
          { key: 'componentType', label: 'Type' },
          { key: 'fileName', label: 'File' },
          { key: 'fullName', label: 'Name' },
          { key: 'problem', label: 'Problem' },
        ],
      });
      this.ux.log('');
    }
  }

  private printComponentSuccess(result: DeployResult): void {
    if (result.response.success && result.components?.size) {
      //  sort by type then filename then fullname
      const files = result.getFileResponses().sort((i, j) => {
        if (i.fullName === j.fullName) {
          // same metadata type, according to above comment sort on filename
          if (i.filePath === j.filePath) {
            // same filename's according to comment sort by fullName
            return i.fullName < j.fullName ? 1 : -1;
          }
          return i.filePath < j.filePath ? 1 : -1;
        }
        return i.type < j.type ? 1 : -1;
      });
      // get relative path for table output
      files.forEach((file) => {
        if (file.filePath) {
          file.filePath = path.relative(process.cwd(), file.filePath);
        }
      });
      this.ux.log('');
      this.ux.styledHeader(chalk.blue('Deployed Source'));
      this.ux.table(files, {
        columns: [
          { key: 'fullName', label: 'FULL NAME' },
          { key: 'type', label: 'TYPE' },
          { key: 'filePath', label: 'PROJECT PATH' },
        ],
      });
    }
  }

  private print(result: DeployResult): DeployResult {
    this.printComponentSuccess(result);
    this.printComponentFailures(result);
    // TODO: this.printTestResults(result); <- this has WI @W-8903671@
    if (result.response.success && this.flags.checkonly) {
      this.ux.log(messages.getMessage('checkOnlySuccess'));
    }

    return result;
  }
}
