/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as path from 'path';
import { SfdxCommand } from '@salesforce/command';
import { ComponentSet } from '@salesforce/source-deploy-retrieve';
import { fs, SfdxError, Logger } from '@salesforce/core';
import { ComponentLike } from '@salesforce/source-deploy-retrieve/lib/src/common';

export type FlagOptions = {
  packagenames?: string[];
  sourcepath: string[];
  manifest: string;
  metadata: string[];
  apiversion?: string;
};

export abstract class SourceCommand extends SfdxCommand {
  public static DEFAULT_SRC_WAIT_MINUTES = 33;
  /**
   * will create one ComponentSet to be deployed/retrieved
   * will combine from all options passed in
   *
   * @param options: FlagOptions where to create ComponentSets from
   */
  protected async createComponentSet(options: FlagOptions): Promise<ComponentSet> {
    const logger = Logger.childFromRoot(this.constructor.name);
    const setAggregator: ComponentLike[] = [];

    // go through options to create a list of ComponentSets
    // we'll then combine all of those to deploy/retrieve
    if (options.sourcepath) {
      logger.debug(`Building ComponentSet from sourcepath: ${options.sourcepath.toString()}`);
      options.sourcepath.forEach((filepath) => {
        if (fs.fileExistsSync(filepath)) {
          setAggregator.push(...ComponentSet.fromSource(path.resolve(filepath)));
        } else {
          throw new SfdxError(`The sourcepath "${filepath}" is not a valid source file path.`);
        }
      });
    }

    // Return empty ComponentSet and use packageNames in the library via `.retrieve` options
    if (options.packagenames) {
      logger.debug(`Building ComponentSet for packagenames: ${options.packagenames.toString()}`);
      setAggregator.push(...new ComponentSet([]));
    }

    // Resolve manifest with source in package directories.
    if (options.manifest) {
      logger.debug(`Building ComponentSet from manifest: ${options.manifest}`);
      const packageDirs = this.project.getUniquePackageDirectories().map((pDir) => pDir.fullPath);
      for (const packageDir of packageDirs) {
        logger.debug(`Searching in packageDir: ${packageDir} for matching metadata`);
        const compSet = await ComponentSet.fromManifestFile(options.manifest, { resolve: packageDir });
        setAggregator.push(...compSet);
      }
    }

    // Resolve metadata entries with source in package directories.
    if (options.metadata) {
      logger.debug(`Building ComponentSet from metadata: ${options.metadata.toString()}`);

      // Build a Set of metadata entries
      const compSet = new ComponentSet();
      options.metadata.forEach((entry) => {
        const splitEntry = entry.split(':');
        compSet.add({
          type: splitEntry[0],
          fullName: splitEntry.length === 1 ? '*' : splitEntry[1],
        });
      });

      // Search the packages directories for matching metadata
      const packageDirs = this.project.getUniquePackageDirectories().map((pDir) => pDir.fullPath);
      for (const packageDir of packageDirs) {
        logger.debug(`Searching for matching metadata in packageDir: ${packageDir}`);
        setAggregator.push(...compSet.resolveSourceComponents(packageDir, { filter: compSet }));
      }
    }

    const componentSet = new ComponentSet(setAggregator);
    if (componentSet.size) {
      logger.debug(`Matching metadata files (${componentSet.size}):`);
      // Log up to 20 file matches
      const components = componentSet.getSourceComponents().toArray();
      for (let i = 0; i < componentSet.size; i++) {
        logger.debug(components[i].content);
        if (i > 19) {
          logger.debug(`(showing 20 of ${componentSet.size} matches)`);
          break;
        }
      }
    }

    if (options.apiversion) {
      componentSet.apiVersion = options.apiversion;
    }

    return componentSet;
  }
}
