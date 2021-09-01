/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as os from 'os';
import { prompt } from 'cli-ux/lib/prompt';
import { flags, FlagsConfig } from '@salesforce/command';
import { fs, Messages } from '@salesforce/core';
import { ComponentSet, RequestStatus, SourceComponent } from '@salesforce/source-deploy-retrieve';
import { Duration, once, env } from '@salesforce/kit';
import { getString } from '@salesforce/ts-types';
import * as chalk from 'chalk';
import { DeployCommand } from '../../../deployCommand';
import { ComponentSetBuilder } from '../../../componentSetBuilder';
import { DeployCommandResult } from '../../../formatters/deployResultFormatter';
import { DeleteResultFormatter } from '../../../formatters/deleteResultFormatter';
import { ProgressFormatter } from '../../../formatters/progressFormatter';
import { DeployProgressBarFormatter } from '../../../formatters/deployProgressBarFormatter';
import { DeployProgressStatusFormatter } from '../../../formatters/deployProgressStatusFormatter';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'delete');

type TestLevel = 'NoTestRun' | 'RunLocalTests' | 'RunAllTestsInOrg';

export class Delete extends DeployCommand {
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
      default: Duration.minutes(Delete.DEFAULT_SRC_WAIT_MINUTES),
      min: Duration.minutes(1),
      description: messages.getMessage('flags.wait'),
    }),
    testlevel: flags.enum({
      char: 'l',
      description: messages.getMessage('flags.testLevel'),
      options: ['NoTestRun', 'RunLocalTests', 'RunAllTestsInOrg'],
      default: 'NoTestRun',
    }),
    noprompt: flags.boolean({
      char: 'r',
      description: messages.getMessage('flags.noprompt'),
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
    verbose: flags.builtin({
      description: messages.getMessage('flags.verbose'),
    }),
  };
  protected xorFlags = ['metadata', 'sourcepath'];
  protected readonly lifecycleEventNames = ['predeploy', 'postdeploy'];
  private sourceComponents: SourceComponent[];

  private updateDeployId = once((id) => {
    this.displayDeployId(id);
    this.setStash(id);
  });

  public async run(): Promise<DeployCommandResult> {
    await this.delete();
    this.resolveSuccess();
    return this.formatResult();
  }

  protected async delete(): Promise<void> {
    // verify that the user defined one of: metadata, sourcepath
    this.validateFlags();

    this.componentSet = await ComponentSetBuilder.build({
      apiversion: this.getFlag<string>('apiversion'),
      sourceapiversion: await this.getSourceApiVersion(),
      sourcepath: this.getFlag<string[]>('sourcepath'),
      metadata: this.flags.metadata && {
        metadataEntries: this.getFlag<string[]>('metadata'),
        directoryPaths: this.getPackageDirs(),
      },
    });

    this.sourceComponents = this.componentSet.getSourceComponents().toArray();

    if (!this.sourceComponents.length) {
      // if we didn't find any components to delete, let the user know and exit
      // matches toolbelt
      this.ux.styledHeader(chalk.blue('Deleted Source'));
      this.ux.log('No results found');
      this.exit(0);
    }

    // create a new ComponentSet and mark everything for deletion
    const cs = new ComponentSet([]);
    this.sourceComponents.map((c) => {
      cs.add(c, true);
    });
    this.componentSet = cs;

    if (!(await this.handlePrompt())) {
      // the user said 'no' to the prompt
      this.exit(0);
    }

    // fire predeploy event for the delete
    await this.lifecycle.emit('predeploy', this.componentSet.toArray());
    this.ux.log('*** Deleting with SOAP API ***');

    const deploy = await this.componentSet.deploy({
      usernameOrConnection: this.org.getUsername(),
      apiOptions: {
        checkOnly: this.getFlag<boolean>('checkonly', false),
        testLevel: this.getFlag<TestLevel>('testlevel'),
      },
    });
    this.updateDeployId(deploy.id);

    if (!this.isJsonOutput()) {
      const progressFormatter: ProgressFormatter = env.getBoolean('SFDX_USE_PROGRESS_BAR', true)
        ? new DeployProgressBarFormatter(this.logger, this.ux)
        : new DeployProgressStatusFormatter(this.logger, this.ux);
      progressFormatter.progress(deploy);
    }

    this.deployResult = await deploy.pollStatus(500, this.getFlag<Duration>('wait').seconds);
    await this.lifecycle.emit('postdeploy', this.deployResult);
  }

  /**
   * Checks the response status to determine whether the delete was successful.
   */
  protected resolveSuccess(): void {
    const status = getString(this.deployResult, 'response.status');
    if (status !== RequestStatus.Succeeded) {
      this.setExitCode(1);
    }
  }

  protected formatResult(): DeployCommandResult {
    const formatterOptions = {
      verbose: this.getFlag<boolean>('verbose', false),
    };

    const formatter = new DeleteResultFormatter(this.logger, this.ux, formatterOptions, this.deployResult);

    // The DeleteResultFormatter will use SDR and scan the directory, if the files have been deleted, it will throw an error
    // so we'll delete the files locally now
    if (!this.getFlag('checkonly')) {
      this.sourceComponents.map((component) => {
        fs.unlinkSync(component.content);
        fs.unlinkSync(component.xml);
      });
    }

    // Only display results to console when JSON flag is unset.
    if (!this.isJsonOutput()) {
      formatter.display();
    }

    return formatter.getJson();
  }

  private async handlePrompt(): Promise<boolean> {
    if (!this.getFlag('noprompt')) {
      const paths = this.sourceComponents.map((component) => component.content + '\n' + component.xml).join('\n');
      const promptMessage = messages.getMessage('prompt', [paths]);
      const answer = (await prompt(promptMessage)) as string;
      return answer.toUpperCase() === 'YES' || answer.toUpperCase() === 'Y';
    }
    return true;
  }
}
