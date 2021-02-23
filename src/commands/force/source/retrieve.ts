/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as os from 'os';
// import * as path from 'path';
import { flags, FlagsConfig } from '@salesforce/command';
import { Lifecycle, Messages, SfdxError, SfdxProjectJson } from '@salesforce/core';
// import { SourceRetrieveResult } from '@salesforce/source-deploy-retrieve';
import { Duration } from '@salesforce/kit';
import { asArray, asString } from '@salesforce/ts-types';
// import { blue, yellow } from 'chalk';
import { SourceCommand } from '../../../sourceCommand';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'retrieve');

export class retrieve extends SourceCommand {
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
      min: SourceCommand.MINIMUM_SRC_WAIT_MINUTES,
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
  public async run(): Promise<any> {
    const hookEmitter = Lifecycle.getInstance();

    const proj = await SfdxProjectJson.create({});
    const packages = await proj.getPackageDirectories();
    const defaultPackage = packages.find((pkg) => pkg.default);

    const cs = await this.createComponentSet({
      // safe to cast from the flags as an array of strings
      packagenames: asArray<string>(this.flags.packagenames),
      sourcepath: asArray<string>(this.flags.sourcepath),
      manifest: asString(this.flags.manifest),
      metadata: asArray<string>(this.flags.metadata),
    });

    // emit pre retrieve event
    // needs to be a path to the temp dir package.xml
    await hookEmitter.emit('preretrieve', { packageXmlPath: cs.getPackageXml() });

    const mdapiResult = await cs
      .retrieve({
        usernameOrConnection: this.org.getUsername(),
        merge: true,
        output: (this.flags.sourcepath as string) ?? defaultPackage.path,
        // TODO: fix this once wait has been updated in library
        // wait: (this.flags.wait as Duration).milliseconds,
        // TODO: implement retrieve via package name
        // package: options.packagenames
      })
      .start();

    const results = mdapiResult.response;
    await hookEmitter.emit('postretrieve', results);

    if (results.status === 'InProgress') {
      throw new SfdxError(messages.getMessage('retrieveTimeout', [(this.flags.wait as Duration).minutes]));
    }
    // this.printTable(results, true);

    return results;
  }

  /**
   * to print the results table of successes, failures, partial failures
   *
   * @param results what the .deploy or .retrieve method returns
   * @param withoutState a boolean to add state, default to true
   */
  // public printTable(results: SourceRetrieveResult, withoutState?: boolean): void {
  //   const stateCol = withoutState ? [] : [{ key: 'state', label: messages.getMessage('stateTableColumn') }];

  //   this.ux.styledHeader(blue(messages.getMessage('retrievedSourceHeader')));
  //   if (results.success && results.successes.length) {
  //     const columns = [
  //       { key: 'properties.fullName', label: messages.getMessage('fullNameTableColumn') },
  //       { key: 'properties.type', label: messages.getMessage('typeTableColumn') },
  //       {
  //         key: 'properties.fileName',
  //         label: messages.getMessage('workspacePathTableColumn'),
  //       },
  //     ];
  //     this.ux.table(results.successes, { columns: [...stateCol, ...columns] });
  //   } else {
  //     this.ux.log(messages.getMessage('NoResultsFound'));
  //   }

  //   if (results.status === 'PartialSuccess' && results.successes.length && results.failures.length) {
  //     this.ux.log('');
  //     this.ux.styledHeader(yellow(messages.getMessage('metadataNotFoundWarning')));
  //     results.failures.forEach((warning) => this.ux.log(warning.message));
  //   }
  // }
}
