/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as path from 'path';
import { SfdxCommand } from '@salesforce/command';
import { ComponentSet } from '@salesforce/source-deploy-retrieve';
import { fs, SfdxError } from '@salesforce/core';
import { ComponentLike } from '@salesforce/source-deploy-retrieve/lib/src/common';

export type FlagOptions = {
  packagenames?: string[];
  sourcepath: string[];
  manifest: string;
  metadata: string[];
};

export const MINIMUM_SRC_WAIT_MINUTES = 1;
export const DEFAULT_SRC_WAIT_MINUTES = 33;

export abstract class SourceCommand extends SfdxCommand {
  /**
   * will create one ComponentSet to be deployed/retrieved
   * will combine from all options passed in
   *
   * @param options: FlagOptions where to create ComponentSets from
   */
  protected async createComponentSet(options: FlagOptions): Promise<ComponentSet> {
    const setAggregator: ComponentLike[] = [];

    // go through options to create a list of ComponentSets
    // we'll then combine all of those to deploy/retrieve
    if (options.sourcepath) {
      options.sourcepath.forEach((filepath) => {
        if (fs.fileExistsSync(filepath)) {
          this.logger.debug(`Creating ComponentSet from sourcepath ${path.resolve(filepath)}`);
          setAggregator.push(...ComponentSet.fromSource(path.resolve(filepath)));
        } else {
          throw SfdxError.create('@salesforce/plugin-source', 'sourceCommand', 'SourcePathInvalid', [filepath]);
        }
      });
    }

    if (options.packagenames) {
      // retrieve only
      // TODO: @W-8908888@
    }

    if (options.manifest) {
      this.logger.debug(`Creating ComponentSet from manifest ${path.resolve(options.manifest)}`);

      setAggregator.push(
        ...(await ComponentSet.fromManifestFile(options.manifest, {
          // to create a link to the actual source component we need to have it resolve through all packages
          // to find the matching source metadata
          // this allows us to deploy after
          resolve: process.cwd(),
        }))
      );
    }

    if (options.metadata) {
      options.metadata.forEach((entry) => {
        const splitEntry = entry.split(':');
        const metadata: ComponentLike = {
          type: splitEntry[0],
          // either -m ApexClass or -m ApexClass:MyApexClass
          fullName: splitEntry.length === 1 ? '*' : splitEntry[1],
        };
        this.logger.debug(`Creating ComponentSet from metadata member ${metadata.type}:${metadata.fullName}`);

        const cs = new ComponentSet([metadata]);
        // we need to search the entire project for the matching metadata component
        // no better way than to have it search than process.cwd()
        cs.resolveSourceComponents(process.cwd(), { filter: cs });
        setAggregator.push(...cs);
      });
    }

    return new ComponentSet(setAggregator);
  }
}
