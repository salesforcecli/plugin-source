/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import { ComponentSet } from '@salesforce/source-deploy-retrieve';
import { ComponentLike } from '@salesforce/source-deploy-retrieve/lib/src/resolve/types';
import { fs, SfdxError, Logger } from '@salesforce/core';

export type ManifestOption = {
  manifestPath: string;
  directoryPaths: string[];
};
export type MetadataOption = {
  metadataEntries: string[];
  directoryPaths: string[];
};
export type ComponentSetOptions = {
  packagenames?: string[];
  sourcepath?: string[];
  manifest?: ManifestOption;
  metadata?: MetadataOption;
  apiversion?: string;
};

export class ComponentSetBuilder {
  /**
   * Builds a ComponentSet that can be used for source conversion,
   * deployment, or retrieval, using all specified options.
   *
   * @see https://github.com/forcedotcom/source-deploy-retrieve/blob/develop/src/collections/componentSet.ts
   *
   * @param options: options for creating a ComponentSet
   */
  public static async build(options: ComponentSetOptions): Promise<ComponentSet> {
    const logger = Logger.childFromRoot('createComponentSet');
    const csAggregator: ComponentLike[] = [];

    const { sourcepath, manifest, metadata, packagenames, apiversion } = options;

    if (sourcepath) {
      logger.debug(`Building ComponentSet from sourcepath: ${sourcepath.toString()}`);
      sourcepath.forEach((filepath) => {
        if (fs.fileExistsSync(filepath)) {
          csAggregator.push(...ComponentSet.fromSource(path.resolve(filepath)));
        } else {
          throw new SfdxError(`The sourcepath "${filepath}" is not a valid source file path.`);
        }
      });
    }

    // Return empty ComponentSet and use packageNames in the library via `.retrieve` options
    if (packagenames) {
      logger.debug(`Building ComponentSet for packagenames: ${packagenames.toString()}`);
      csAggregator.push(...new ComponentSet([]));
    }

    // Resolve manifest with source in package directories.
    if (manifest) {
      logger.debug(`Building ComponentSet from manifest: ${manifest.manifestPath}`);
      const directoryPaths = options.manifest.directoryPaths;
      logger.debug(`Searching in packageDir: ${directoryPaths.join(', ')} for matching metadata`);
      const compSet = await ComponentSet.fromManifest({
        manifestPath: manifest.manifestPath,
        resolveSourcePaths: options.manifest.directoryPaths,
      });
      csAggregator.push(...compSet);
    }

    // Resolve metadata entries with source in package directories.
    if (metadata) {
      logger.debug(`Building ComponentSet from metadata: ${metadata.metadataEntries.toString()}`);

      // Build a Set of metadata entries
      const filter = new ComponentSet();
      metadata.metadataEntries.forEach((entry) => {
        const splitEntry = entry.split(':');
        filter.add({
          type: splitEntry[0],
          fullName: splitEntry.length === 1 ? '*' : splitEntry[1],
        });
      });

      const directoryPaths = options.metadata.directoryPaths;
      logger.debug(`Searching for matching metadata in directories: ${directoryPaths.join(', ')}`);
      const fromSource = ComponentSet.fromSource({ fsPaths: directoryPaths, include: filter });
      // If no matching metadata is found, default to the original component set
      const finalized = fromSource.size > 0 ? fromSource : filter;
      csAggregator.push(...finalized);
    }

    const componentSet = new ComponentSet(csAggregator);

    // This is only for debug output of matched files based on the command flags.
    // It will log up to 20 file matches.
    if (logger.debugEnabled && componentSet.size) {
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

    if (apiversion) {
      componentSet.apiVersion = apiversion;
    }

    return componentSet;
  }
}
