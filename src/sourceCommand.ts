/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as path from 'path';
import { SfdxCommand } from '@salesforce/command';
import { ComponentSet } from '@salesforce/source-deploy-retrieve';
import { fs, SfdxError, Logger, ConfigFile } from '@salesforce/core';
import { ComponentLike } from '@salesforce/source-deploy-retrieve/lib/src/resolve';

export type FlagOptions = {
  packagenames?: string[];
  sourcepath: string[];
  manifest: string;
  metadata: string[];
  apiversion?: string;
};

export abstract class SourceCommand extends SfdxCommand {
  public static DEFAULT_SRC_WAIT_MINUTES = 33;
  public static STASH_KEY = 'SOURCE_DEPLOY';

  public getConfig(): ConfigFile<{ isGlobal: true; filename: 'stash.json' }> {
    return new ConfigFile({ isGlobal: true, filename: 'stash.json' });
  }

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
      logger.debug(`Searching in packageDir: ${packageDirs.join(', ')} for matching metadata`);
      const compSet = await ComponentSet.fromManifest({
        manifestPath: options.manifest,
        resolveSourcePaths: packageDirs,
      });
      setAggregator.push(...compSet);
    }

    // Resolve metadata entries with source in package directories.
    if (options.metadata) {
      logger.debug(`Building ComponentSet from metadata: ${options.metadata.toString()}`);

      // Build a Set of metadata entries
      const filter = new ComponentSet();
      options.metadata.forEach((entry) => {
        const splitEntry = entry.split(':');
        filter.add({
          type: splitEntry[0],
          fullName: splitEntry.length === 1 ? '*' : splitEntry[1],
        });
      });

      // Search the packages directories for matching metadata
      const packageDirs = this.project.getUniquePackageDirectories().map((pDir) => pDir.fullPath);
      logger.debug(`Searching for matching metadata in packageDirs: ${packageDirs.join(', ')}`);

      const fromSource = ComponentSet.fromSource({ fsPaths: packageDirs, include: filter });
      // If no matching metadata is found, default to the original component set
      const finalized = fromSource.size > 0 ? fromSource : filter;
      setAggregator.push(...finalized);
    }

    const componentSet = new ComponentSet(setAggregator);

    // This is only for debug output of matched files based on the command flags.
    // It will log up to 20 file matches.
    // TODO: add logger.debugEnabled
    if (componentSet.size) {
      logger.debug(`Matching metadata files (${componentSet.size}):`);
      const components = componentSet.getSourceComponents().toArray();
      for (let i = 0; i < componentSet.size; i++) {
        if (components[i]?.content) {
          logger.debug(components[i].content);
        } else if (components[i]?.xml) {
          logger.debug(components[i].xml);
        }

        if (i > 18) {
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
