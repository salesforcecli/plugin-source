/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as path from 'path';
import { SfdxCommand } from '@salesforce/command';
import { ComponentSet, SourceRetrieveResult } from '@salesforce/source-deploy-retrieve';
import { fs, Messages, PackageDir, SfdxError, SfdxProjectJson } from '@salesforce/core';
import { ComponentLike } from '@salesforce/source-deploy-retrieve/lib/src/common';
import { blue, yellow } from 'chalk';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'sourceCommand');

export type FlagOptions = {
  packagenames?: string[];
  sourcepath?: string[];
  manifest?: string;
  metadata?: string[];
};

export const MINIMUM_SRC_WAIT_MINUTES = 1;
export const DEFAULT_SRC_WAIT_MINUTES = 33;

export abstract class SourceCommand extends SfdxCommand {
  public async retrievePackageDirs(): Promise<PackageDir[]> {
    const proj = await SfdxProjectJson.create({});
    return await proj.getPackageDirectories();
  }

  /**
   * creates an absolute path by joining process.cwd() and the passed in string
   *
   * @param relPath
   */
  public getAbsolutePath(relPath: string): string {
    return path.join(process.cwd(), relPath);
  }

  /**
   * will create one ComponentSet to be deployed/retrieved
   * will combine from all options passed in
   *
   * @param options: FlagOptions where to create ComponentSets from
   */
  public async createComponentSet(options: FlagOptions): Promise<ComponentSet> {
    const setAggregator: ComponentSet[] = [];
    const pkgs = await this.retrievePackageDirs();
    // go through options to create a list of ComponentSets
    // we'll then combine all of those to deploy/retrieve
    if (options.sourcepath) {
      options.sourcepath.forEach((filepath) => {
        if (fs.fileExistsSync(filepath)) {
          setAggregator.push(ComponentSet.fromSource(this.getAbsolutePath(filepath)));
        } else {
          throw SfdxError.create('@salesforce/plugin-source', 'sourceCommand', 'SourcePathInvalid', [filepath]);
        }
      });
    }

    if (options.packagenames) {
      // filter from all the packages to the ones requested
      // will be package name, could include spaces
      pkgs
        .filter((pkg) => {
          return options.packagenames.includes(pkg.path);
        })
        // for the requested ones get the ComponentSet from their path
        .forEach((pkg) => {
          setAggregator.push(ComponentSet.fromSource(this.getAbsolutePath(pkg.path)));
        });
    }

    if (options.manifest) {
      setAggregator.push(
        await ComponentSet.fromManifestFile(options.manifest, {
          // to create a link to the actual source component we need to have it resolve through all packages
          // to find the matching source metadata
          // this allows us to deploy after
          resolve: pkgs.map((pkg) => this.getAbsolutePath(pkg.path)),
        })
      );
    }

    if (options.metadata) {
      options.metadata.forEach((entry) => {
        const splitEntry = entry.split(':');
        const metadata: ComponentLike = { fullName: undefined, type: undefined };
        if (splitEntry.length === 1) {
          // -m ApexClass
          metadata.type = splitEntry[0];
          metadata.fullName = '*';
        } else {
          // -m ApexClass:MyApexClass
          metadata.type = splitEntry[0];
          metadata.fullName = splitEntry[1];
        }
        const cs = new ComponentSet([metadata]);
        // not sure about the process.cwd()
        cs.resolveSourceComponents(process.cwd(), { filter: cs });
        setAggregator.push(cs);
      });
    }

    // join the ComponentSets in the aggregator into one
    // combining ComponentLike objects from across packages to do a single deploy/retrieve call
    const merged: ComponentLike[] = [];
    setAggregator.forEach((set) => {
      merged.push(...set);
    });

    return new ComponentSet(merged);
  }

  /**
   * to print the results table of successes, failures, partial failures
   *
   * @param results what the .deploy or .retrieve method returns
   * @param withoutState a boolean to add state, default to true
   */
  public printTable(results: SourceRetrieveResult, withoutState?: boolean): void {
    const stateCol = withoutState ? [] : [{ key: 'state', label: messages.getMessage('stateTableColumn') }];

    this.ux.styledHeader(blue(messages.getMessage('retrievedSourceHeader')));
    if (results.success && results.successes.length) {
      const columns = [
        { key: 'properties.fullName', label: messages.getMessage('fullNameTableColumn') },
        { key: 'properties.type', label: messages.getMessage('typeTableColumn') },
        {
          key: 'properties.fileName',
          label: messages.getMessage('workspacePathTableColumn'),
        },
      ];
      this.ux.table(results.successes, { columns: [...stateCol, ...columns] });
    } else {
      this.ux.log(messages.getMessage('NoResultsFound'));
    }

    if (results.status === 'PartialSuccess' && results.successes.length && results.failures.length) {
      this.ux.log('');
      this.ux.styledHeader(yellow(messages.getMessage('metadataNotFoundWarning')));
      results.failures.forEach((warning) => this.ux.log(warning.message));
    }
  }
}
