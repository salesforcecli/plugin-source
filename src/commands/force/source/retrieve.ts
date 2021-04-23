/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as os from 'os';
import { flags, FlagsConfig } from '@salesforce/command';
import { Lifecycle, Messages } from '@salesforce/core';
import { Duration } from '@salesforce/kit';
import { asArray, asString, getBoolean, getString } from '@salesforce/ts-types';
import { RetrieveResult } from '@salesforce/source-deploy-retrieve';
import { RequestStatus } from '@salesforce/source-deploy-retrieve/lib/src/client/types';
import { SourceCommand } from '../../../sourceCommand';
import { RetrieveResultFormatter, RetrieveCommandResult } from '../../../formatters/retrieveResultFormatter';

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
    const hookEmitter = Lifecycle.getInstance();

    const cs = await this.createComponentSet({
      packagenames: asArray<string>(this.flags.packagenames),
      sourcepath: asArray<string>(this.flags.sourcepath),
      manifest: asString(this.flags.manifest),
      metadata: asArray<string>(this.flags.metadata),
      apiversion: asString(this.flags.apiversion),
    });

    // Emit the preretrieve event, which needs the package.xml from the ComponentSet
    await hookEmitter.emit('preretrieve', { packageXmlPath: cs.getPackageXml() });

    this.retrieveResult = await cs
      .retrieve({
        usernameOrConnection: this.org.getUsername(),
        merge: true,
        output: this.project.getDefaultPackage().fullPath,
        packageNames: asArray<string>(this.flags.packagenames),
      })
      .start();

    await hookEmitter.emit('postretrieve', this.retrieveResult.response);
  }

  protected resolveSuccess(): void {
    const status = getString(this.retrieveResult, 'response.status');
    if (status !== RequestStatus.Succeeded) {
      this.setExitCode(1);
    }
  }

  protected formatResult(): RetrieveCommandResult {
    const formatterOptions = {
      waitTime: (this.flags.wait as Duration).quantity,
      verbose: getBoolean(this.flags, 'verbose', false),
    };
    const formatter = new RetrieveResultFormatter(this.logger, this.ux, formatterOptions, this.retrieveResult);

    // Only display results to console when JSON flag is unset.
    if (!this.isJsonOutput()) {
      formatter.display();
    }

    return formatter.getJson();
  }
}
