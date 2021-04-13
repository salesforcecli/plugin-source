/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as os from 'os';

import { flags, FlagsConfig } from '@salesforce/command';
import { Lifecycle, Messages, SfdxError } from '@salesforce/core';
import { Duration } from '@salesforce/kit';
import { asArray, asString } from '@salesforce/ts-types';
import { blue } from 'chalk';
import { MetadataApiRetrieveStatus, RetrieveResult } from '@salesforce/source-deploy-retrieve';
import { FileProperties } from '@salesforce/source-deploy-retrieve/lib/src/client/types';
import { SourceCommand } from '../../../sourceCommand';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'retrieve');

export class Retrieve2 extends SourceCommand {
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessage('examples').split(os.EOL);
  public static readonly requiresProject = true;
  public static readonly requiresUsername = true;
  public static readonly flagsConfig: FlagsConfig = {
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
  };
  protected readonly lifecycleEventNames = ['preretrieve', 'postretrieve'];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async run(): Promise<RetrieveResult> {
    const hookEmitter = Lifecycle.getInstance();

    const defaultPackagePath = this.project.getDefaultPackage().fullPath;

    const cs = await this.createComponentSet({
      packagenames: asArray<string>(this.flags.packagenames),
      sourcepath: asArray<string>(this.flags.sourcepath),
      manifest: asString(this.flags.manifest),
      metadata: asArray<string>(this.flags.metadata),
      apiversion: asString(this.flags.apiversion),
    });

    // Emit the preretrieve event, which needs the package.xml from the ComponentSet
    await hookEmitter.emit('preretrieve', { packageXmlPath: cs.getPackageXml() });

    const mdapiResult = await cs
      .retrieve({
        usernameOrConnection: this.org.getUsername(),
        merge: true,
        output: defaultPackagePath,
        packageNames: asArray<string>(this.flags.packagenames),
      })
      .start();

    const results = mdapiResult.response;
    await hookEmitter.emit('postretrieve', results);

    if (results.status === 'InProgress') {
      throw new SfdxError(messages.getMessage('retrieveTimeout', [(this.flags.wait as Duration).minutes]));
    }

    if (this.flags.json) {
      this.ux.logJson(mdapiResult.getFileResponses());
    } else {
      this.printTable(results, true);
    }

    return mdapiResult;
  }

  /**
   * to print the results table of successes, failures, partial failures
   *
   * @param results what the .deploy or .retrieve method returns
   * @param withoutState a boolean to add state, default to true
   */
  public printTable(results: MetadataApiRetrieveStatus, withoutState?: boolean): void {
    const stateCol = withoutState ? [] : [{ key: 'state', label: 'STATE' }];

    this.ux.styledHeader(blue(messages.getMessage('retrievedSourceHeader')));
    if (results.success) {
      const columns = [
        { key: 'fullName', label: 'FULL NAME' },
        { key: 'type', label: 'TYPE' },
        { key: 'fileName', label: 'PROJECT PATH' },
      ];
      this.ux.table(results.fileProperties as FileProperties[], { columns: [...stateCol, ...columns] });
    } else {
      this.ux.log(messages.getMessage('NoResultsFound'));
    }

    // if (results.status === 'SucceededPartial' && results.successes.length && results.failures.length) {
    //   this.ux.log('');
    //   this.ux.styledHeader(yellow(messages.getMessage('metadataNotFoundWarning')));
    //   results.failures.forEach((warning) => this.ux.log(warning.message));
    // }
  }
}
