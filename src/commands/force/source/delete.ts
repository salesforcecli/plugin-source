/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as os from 'os';
import { confirm } from 'cli-ux/lib/prompt';
import { flags, FlagsConfig } from '@salesforce/command';
import { fs, Messages } from '@salesforce/core';
import { ComponentSet, RequestStatus, SourceComponent } from '@salesforce/source-deploy-retrieve';
import { Duration, once, env } from '@salesforce/kit';
import { getString } from '@salesforce/ts-types';
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
      longDescription: messages.getMessage('flags.checkonlyLong'),
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
      description: messages.getMessage('flags.sourcepath'),
      longDescription: messages.getMessage('flags.sourcepathLong'),
      exclusive: ['manifest', 'metadata'],
    }),
    verbose: flags.builtin({
      description: messages.getMessage('flags.verbose'),
    }),
  };
  protected xorFlags = ['metadata', 'sourcepath'];
  protected readonly lifecycleEventNames = ['predeploy', 'postdeploy'];
  private sourceComponents: SourceComponent[];
  private isRest = false;
  private deleteResultFormatter: DeleteResultFormatter;
  private aborted = false;

  private updateDeployId = once((id) => {
    this.displayDeployId(id);
    this.setStash(id);
  });

  public async run(): Promise<DeployCommandResult> {
    await this.delete();
    this.resolveSuccess();
    const result = this.formatResult();
    // The DeleteResultFormatter will use SDR and scan the directory, if the files have been deleted, it will throw an error
    // so we'll delete the files locally now
    this.deleteFilesLocally();
    return result;
  }

  protected async delete(): Promise<void> {
    this.deleteResultFormatter = new DeleteResultFormatter(this.logger, this.ux, {});
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
      this.deleteResultFormatter.displayNoResultsFound();
      return;
    }

    // create a new ComponentSet and mark everything for deletion
    const cs = new ComponentSet([]);
    this.sourceComponents.map((component) => {
      cs.add(component, true);
    });
    this.componentSet = cs;

    this.aborted = !(await this.handlePrompt());
    if (this.aborted) return;

    // fire predeploy event for the delete
    await this.lifecycle.emit('predeploy', this.componentSet.toArray());
    this.isRest = await this.isRestDeploy();
    this.ux.log(`*** Deleting with ${this.isRest ? 'REST' : 'SOAP'} API ***`);

    const deploy = await this.componentSet.deploy({
      usernameOrConnection: this.org.getUsername(),
      apiOptions: {
        rest: this.isRest,
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
    if (status !== RequestStatus.Succeeded && !this.aborted) {
      this.setExitCode(1);
    }
  }

  protected formatResult(): DeployCommandResult {
    const formatterOptions = {
      verbose: this.getFlag<boolean>('verbose', false),
    };

    this.deleteResultFormatter = new DeleteResultFormatter(this.logger, this.ux, formatterOptions, this.deployResult);

    // Only display results to console when JSON flag is unset.
    if (!this.isJsonOutput()) {
      this.deleteResultFormatter.display();
    }

    return this.deleteResultFormatter.getJson();
  }

  private deleteFilesLocally(): void {
    if (!this.getFlag('checkonly') && getString(this.deployResult, 'response.status') === 'Succeeded') {
      this.sourceComponents.map((component) => {
        // delete the content and/or the xml of the components
        if (component.content) {
          const stats = fs.lstatSync(component.content);
          if (stats.isDirectory()) {
            fs.rmdirSync(component.content, { recursive: true });
          } else {
            fs.unlinkSync(component.content);
          }
        }
        // the xml could've been deleted as part of a bundle type above
        if (component.xml && fs.existsSync(component.xml)) {
          fs.unlinkSync(component.xml);
        }
      });
    }
  }

  private async handlePrompt(): Promise<boolean> {
    if (!this.getFlag('noprompt')) {
      const paths = this.sourceComponents.flatMap((component) => [component.xml, ...component.walkContent()]);
      const promptMessage = messages.getMessage('prompt', [[...new Set(paths)].join('\n')]);

      return confirm(promptMessage);
    }
    return true;
  }
}
