/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as os from 'os';
import * as path from 'path';
import { flags, FlagsConfig } from '@salesforce/command';
import { Lifecycle, Messages, SfdxError } from '@salesforce/core';
import { SourceRetrieveResult } from '@salesforce/source-deploy-retrieve';
import { Duration } from '@salesforce/kit';
import { asString } from '@salesforce/ts-types';
import { DEFAULT_SRC_WAIT_MINUTES, MINIMUM_SRC_WAIT_MINUTES, SourceCommand } from '../../../sourceCommand';

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
      default: Duration.minutes(DEFAULT_SRC_WAIT_MINUTES),
      min: MINIMUM_SRC_WAIT_MINUTES,
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

  public async run(): Promise<SourceRetrieveResult> {
    const hookEmitter = Lifecycle.getInstance();
    const packages = await this.retrievePackageDirs();
    const defaultPackage = packages.find((pkg) => pkg.default);

    const cs = await this.createComponentSet({
      // safe to cast from the flags as an array of strings
      packagenames: this.flags.packagenames as string[],
      sourcepath: this.flags.sourcepath as string[],
      manifest: asString(this.flags.manifest),
      metadata: this.flags.metadata as string[],
    });

    // emit pre retrieve event
    // needs to be a path to the temp dir package.xml
    await hookEmitter.emit('preretrieve', { packageXmlPath: cs.getPackageXml() });

    const results = await cs.retrieve(this.org.getUsername(), path.resolve(defaultPackage.path), {
      merge: true,
      // TODO: fix this once wait has been updated in library
      wait: 1000000,
    });

    await hookEmitter.emit('postretrieve', results);

    if (results.status === 'InProgress') {
      throw new SfdxError(messages.getMessage('retrieveTimeout', [(this.flags.wait as Duration).minutes]));
    }
    this.printTable(results, true);

    return results;
  }
}
