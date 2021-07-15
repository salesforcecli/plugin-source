/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as os from 'os';
import { flags, FlagsConfig } from '@salesforce/command';
import { Messages } from '@salesforce/core';
import { Duration } from '@salesforce/kit';
import { getString } from '@salesforce/ts-types';
import { RetrieveResult } from '@salesforce/source-deploy-retrieve';
import { RequestStatus } from '@salesforce/source-deploy-retrieve/lib/src/client/types';
import { SourceCommand } from '../../../sourceCommand';
import { RetrieveResultFormatter, RetrieveCommandResult } from '../../../formatters/retrieveResultFormatter';
import { ComponentSetBuilder } from '../../../componentSetBuilder';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'retrieve');

export class Retrieve extends SourceCommand {
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessage('examples').split(os.EOL);
  public static readonly requiresProject = true;
  public static readonly requiresUsername = true;
  public static readonly flagsConfig: FlagsConfig = {
    apiversion: flags.builtin({
      /* eslint-disable-next-line @typescript-eslint/ban-ts-comment */
      // @ts-ignore force char override for backward compat
      char: 'a',
    }),
    sourcepath: flags.array({
      char: 'p',
      description: messages.getMessage('flags.sourcePath'),
      exclusive: ['manifest', 'metadata'],
    }),
    wait: flags.minutes({
      char: 'w',
      default: Duration.minutes(SourceCommand.DEFAULT_SRC_WAIT_MINUTES),
      min: Duration.minutes(1),
      description: messages.getMessage('flags.wait'),
    }),
    manifest: flags.filepath({
      char: 'x',
      description: messages.getMessage('flags.manifest'),
      exclusive: ['metadata', 'sourcepath'],
    }),
    metadata: flags.array({
      char: 'm',
      description: messages.getMessage('flags.metadata'),
      exclusive: ['manifest', 'sourcepath'],
    }),
    packagenames: flags.array({
      char: 'n',
      description: messages.getMessage('flags.packagename'),
    }),
    verbose: flags.builtin({
      description: messages.getMessage('flags.verbose'),
    }),
  };
  protected readonly lifecycleEventNames = ['preretrieve', 'postretrieve'];
  protected retrieveResult: RetrieveResult;

  public async run(): Promise<RetrieveCommandResult> {
    await this.retrieve();
    this.resolveSuccess();
    return this.formatResult();
  }

  protected async retrieve(): Promise<void> {
    this.componentSet = await ComponentSetBuilder.build({
      apiversion: this.getFlag<string>('apiversion'),
      sourceapiversion: await this.getSourceApiVersion(),
      packagenames: this.getFlag<string[]>('packagenames'),
      sourcepath: this.getFlag<string[]>('sourcepath'),
      manifest: this.flags.manifest && {
        manifestPath: this.getFlag<string>('manifest'),
        directoryPaths: this.getPackageDirs(),
      },
      metadata: this.flags.metadata && {
        metadataEntries: this.getFlag<string[]>('metadata'),
        directoryPaths: this.getPackageDirs(),
      },
    });

    await this.lifecycle.emit('preretrieve', this.componentSet.toArray());

    const mdapiRetrieve = await this.componentSet.retrieve({
      usernameOrConnection: this.org.getUsername(),
      merge: true,
      output: this.project.getDefaultPackage().fullPath,
      packageOptions: this.getFlag<string[]>('packagenames'),
    });

    this.retrieveResult = await mdapiRetrieve.pollStatus(1000, this.getFlag<Duration>('wait').seconds);

    await this.lifecycle.emit('postretrieve', this.retrieveResult.getFileResponses());
  }

  protected resolveSuccess(): void {
    const status = getString(this.retrieveResult, 'response.status');
    if (status !== RequestStatus.Succeeded) {
      this.setExitCode(1);
    }
  }

  protected formatResult(): RetrieveCommandResult {
    const formatterOptions = {
      waitTime: this.getFlag<Duration>('wait').quantity,
      verbose: this.getFlag<boolean>('verbose', false),
    };
    const formatter = new RetrieveResultFormatter(this.logger, this.ux, formatterOptions, this.retrieveResult);

    // Only display results to console when JSON flag is unset.
    if (!this.isJsonOutput()) {
      formatter.display();
    }

    return formatter.getJson();
  }
}
