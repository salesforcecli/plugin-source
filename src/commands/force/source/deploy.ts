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
import { SourceDeployResult } from '@salesforce/source-deploy-retrieve';
import { Duration } from '@salesforce/kit';
import { asString } from '@salesforce/ts-types';
import * as chalk from 'chalk';
import { SourceCommand } from '../../../sourceCommand';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'deploy');

export class deploy extends SourceCommand {
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessage('examples').split(os.EOL);
  public static readonly requiresProject = true;
  public static readonly requiresUsername = true;
  public static readonly flagsConfig: FlagsConfig = {
    checkonly: flags.boolean({
      char: 'c',
      description: messages.getMessage('flags.checkonly'),
      default: false,
    }),
    wait: flags.minutes({
      char: 'w',
      default: Duration.minutes(SourceCommand.DEFAULT_SRC_WAIT_MINUTES),
      min: Duration.minutes(SourceCommand.MINIMUM_SRC_WAIT_MINUTES),
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
      default: false,
    }),
    ignorewarnings: flags.boolean({
      char: 'g',
      description: messages.getMessage('flags.ignoreWarnings'),
      default: false,
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

  public async run(): Promise<SourceDeployResult> {
    if (this.flags.validatedeployrequestid) {
      // TODO: return this.doDeployRecentValidation();
    }
    const hookEmitter = Lifecycle.getInstance();

    const cs = await this.createComponentSet({
      sourcepath: this.flags.sourcepath as string[],
      manifest: asString(this.flags.manifest),
      metadata: this.flags.metadata as string[],
    });

    await hookEmitter.emit('predeploy', { packageXmlPath: cs.getPackageXml() });

    const results = await cs.deploy(this.org.getUsername(), {
      wait: (this.flags.wait as Duration).milliseconds,
      apiOptions: {
        // TODO: build out more api options
        checkOnly: this.flags.checkonly as boolean,
        ignoreWarnings: this.flags.ignorewarnings as boolean,
        runTests: this.flags.runtests as string[],
      },
    });

    await hookEmitter.emit('postdeploy', results);

    this.print(results);

    return results;
  }

  private printComponentFailures(result: SourceDeployResult): void {
    if (result.status === 'Failed' && result.components) {
      // sort by filename then fullname
      const failures = result.components.sort((i, j) => {
        if (i.component.type.directoryName === j.component.type.directoryName) {
          // if the have the same directoryName then sort by fullName
          return i.component.fullName < j.component.fullName ? 1 : -1;
        }
        return i.component.type.directoryName < j.component.type.directoryName ? 1 : -1;
      });
      this.ux.log('');
      this.ux.styledHeader(chalk.red(`Component Failures [${failures.length}]`));
      this.ux.table(failures, {
        // TODO:  these accessors are temporary until library JSON fixes
        columns: [
          { key: 'component.type.name', label: 'Type' },
          { key: 'diagnostics[0].filePath', label: 'File' },
          { key: 'component.name', label: 'Name' },
          { key: 'diagnostics[0].message', label: 'Problem' },
        ],
      });
      this.ux.log('');
    }
  }

  private printComponentSuccess(result: SourceDeployResult): void {
    if (result.success && result.components) {
      if (result.components.length > 0) {
        //  sort by type then filename then fullname
        const files = result.components.sort((i, j) => {
          if (i.component.type.name === j.component.type.name) {
            // same metadata type, according to above comment sort on filename
            if (i.component.type.directoryName === j.component.type.directoryName) {
              // same filename's according to comment sort by fullName
              return i.component.fullName < j.component.fullName ? 1 : -1;
            }
            return i.component.type.directoryName < j.component.type.directoryName ? 1 : -1;
          }
          return i.component.type.name < j.component.type.name ? 1 : -1;
        });
        // get relative path for table output
        files.forEach((file) => {
          if (file.component.content) {
            file.component.content = path.relative(process.cwd(), file.component.content);
          }
        });
        this.ux.log('');
        this.ux.styledHeader(chalk.blue('Deployed Source'));
        this.ux.table(files, {
          // TODO:  these accessors are temporary until library JSON fixes
          columns: [
            { key: 'component.name', label: 'FULL NAME' },
            { key: 'component.type.name', label: 'TYPE' },
            { key: 'component.content', label: 'PROJECT PATH' },
          ],
        });
      }
    }
  }

  private print(result: SourceDeployResult): SourceDeployResult {
    this.printComponentSuccess(result);
    this.printComponentFailures(result);
    // TODO: this.printTestResults(result); <- this has WI @W-8903671@
    if (result.success && this.flags.checkonly) {
      this.log(messages.getMessage('checkOnlySuccess'));
    }

    return result;
  }
}
