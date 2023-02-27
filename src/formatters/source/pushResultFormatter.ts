/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { relative, resolve as pathResolve } from 'path';
import * as chalk from 'chalk';

import { Messages, SfError } from '@salesforce/core';
import {
  ComponentStatus,
  DeployResult,
  FileResponse,
  MetadataResolver,
  SourceComponent,
  VirtualTreeContainer,
} from '@salesforce/source-deploy-retrieve';
import { isString } from '@salesforce/ts-types';
import { ensureArray } from '@salesforce/kit';
import { Ux } from '@salesforce/sf-plugins-core';
import { ResultFormatter, ResultFormatterOptions } from '../resultFormatter';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'push');

export type PushResponse = {
  pushedSource: Array<Pick<FileResponse, 'filePath' | 'fullName' | 'state' | 'type'>>;
  replacements?: Record<string, string[]>;
};

export class PushResultFormatter extends ResultFormatter {
  protected fileResponses: FileResponse[];
  protected replacements: Map<string, string[]>;
  public constructor(
    ux: Ux,
    options: ResultFormatterOptions,
    protected results: DeployResult[],
    // if your push included deletes that are bundle subcomponents, we'll need to add those deletes to the results even though they aren't included in fileResponses
    protected deletes: string[] = []
  ) {
    super(ux, options);
    this.fileResponses = this.correctFileResponses();
    this.replacements = mergeReplacements(results);
  }

  /**
   * Get the JSON output from the DeployResult.
   *
   * @returns a JSON formatted result matching the provided type.
   */
  public getJson(): PushResponse {
    // throws a particular json structure.
    if (process.exitCode !== 0) {
      const error = new SfError(messages.getMessage('sourcepushFailed', ['']), 'DeployFailed', [], process.exitCode);
      const errorData = this.fileResponses.filter((fileResponse) => fileResponse.state === ComponentStatus.Failed);
      error.setData(errorData);
      error['result'] = errorData;
      error['commandName'] = 'Push';
      // partial success
      if (process.exitCode === 69) {
        error['partialSuccess'] = this.fileResponses.filter(
          (fileResponse) => fileResponse.state !== ComponentStatus.Failed
        );
      }
      throw error;
    }
    // quiet returns only failures
    const toReturn = this.isQuiet()
      ? this.fileResponses.filter((fileResponse) => fileResponse.state === ComponentStatus.Failed)
      : this.fileResponses;
    return {
      pushedSource: toReturn.map(({ state, fullName, type, filePath }) => ({ state, fullName, type, filePath })),
      ...(!this.isQuiet() && this.replacements.size ? { replacements: Object.fromEntries(this.replacements) } : {}),
    } as PushResponse;
  }

  /**
   * Displays deploy results in human readable format.  Output can vary based on:
   *
   * 1. Verbose option
   * 3. Checkonly deploy (checkonly=true)
   * 4. Deploy with test results
   * 5. Canceled status
   */
  public display(): void {
    this.displaySuccesses();
    this.displayFailures();
    this.displayReplacements();
    // Throw a DeployFailed error unless the deployment was successful.
    if (!this.isSuccess()) {
      // Add error message directly on the DeployResult (e.g., a GACK)
      let errMsg = '';
      this.results?.forEach((res) => {
        if (res.response?.errorMessage) {
          errMsg += `${res.response?.errorMessage}\n`;
        }
      });
      throw new SfError(messages.getMessage('sourcepushFailed', [errMsg]), 'PushFailed');
    }
  }

  protected correctFileResponses(): FileResponse[] {
    const withoutUnchanged = this.results.some((result) => result.getFileResponses().length)
      ? this.results.flatMap((result) =>
          result.getFileResponses().filter((fileResponse) => fileResponse.state !== 'Unchanged')
        )
      : [];
    if (!this.deletes.length) {
      return withoutUnchanged;
    }
    const bundlesDeployed = withoutUnchanged.filter((fileResponse) =>
      [
        'LightningComponentBundle',
        'AuraDefinitionBundle',
        'WaveTemplateBundle',
        'ExperiencePropertyTypeBundle',
      ].includes(fileResponse.type)
    );
    if (bundlesDeployed.length === 0) {
      return withoutUnchanged;
    }
    // "content" property of the bundles as a string
    const contentFilePathFromDeployedBundles = this.componentsFromFilenames(
      bundlesDeployed.map((fileResponse) => fileResponse.filePath)
    )
      .map((c) => c.content)
      .filter(isString);

    // there may be deletes not represented in the file responses (if bundle type)
    const resolver = new MetadataResolver(undefined, VirtualTreeContainer.fromFilePaths(this.deletes));
    return this.deletes
      .map((filePath) => {
        const cmp = this.resolveComponentsOrWarn(filePath, resolver)[0];
        if (
          cmp instanceof SourceComponent &&
          cmp.type.strategies?.adapter === 'bundle' &&
          contentFilePathFromDeployedBundles.includes(pathResolve(cmp.content))
        ) {
          return {
            state: ComponentStatus.Deleted,
            fullName: cmp.fullName,
            type: cmp.type.name,
            filePath,
          } as FileResponse;
        }
      })
      .filter((fileResponse) => fileResponse)
      .concat(withoutUnchanged);
  }

  protected displaySuccesses(): void {
    if (this.isQuiet()) {
      return;
    }
    if (this.isSuccess() && this.fileResponses?.length) {
      const successes = this.fileResponses.filter((f) => f.state !== 'Failed');
      if (!successes.length) {
        return;
      }
      this.sortFileResponses(successes);
      this.asRelativePaths(successes);

      this.ux.log('');
      this.ux.styledHeader(chalk.blue('Pushed Source'));
      this.ux.table(
        successes.map((entry) => ({
          state: entry.state,
          fullName: entry.fullName,
          type: entry.type,
          filePath: entry.filePath,
        })),
        {
          state: { header: 'STATE' },
          fullName: { header: 'FULL NAME' },
          type: { header: 'TYPE' },
          filePath: { header: 'PROJECT PATH' },
        }
      );
    }
  }

  protected displayReplacements(): void {
    if (!this.isQuiet() && this.replacements.size) {
      this.ux.log('');
      this.ux.styledHeader(chalk.blue('Metadata Replacements'));
      const replacements = Array.from(this.replacements.entries()).flatMap(([filepath, stringsReplaced]) =>
        stringsReplaced.map((replaced) => ({
          filePath: relative(process.cwd(), filepath),
          replaced,
        }))
      );
      this.ux.table(replacements, {
        filePath: { header: 'PROJECT PATH' },
        replaced: { header: 'TEXT REPLACED' },
      });
    }
  }

  protected displayFailures(): void {
    const failures = [];
    const fileResponseFailures: Map<string, string> = new Map<string, string>();

    if (this.fileResponses?.length) {
      const fileResponses: FileResponse[] = [];
      this.fileResponses
        .filter((f) => f.state === 'Failed')
        .map((f: FileResponse & { error: string }) => {
          fileResponses.push(f);
          fileResponseFailures.set(`${f.type}#${f.fullName}`, f.error);
        });
      this.sortFileResponses(fileResponses);
      this.asRelativePaths(fileResponses);
      failures.push(...fileResponses);
    }

    const deployMessages = this.results?.flatMap((result) => ensureArray(result.response?.details?.componentFailures));
    if (deployMessages.length > failures.length) {
      // if there's additional failures in the API response, find the failure and add it to the output
      deployMessages.map((deployMessage) => {
        if (!fileResponseFailures.has(`${deployMessage.componentType}#${deployMessage.fullName}`)) {
          // duplicate the problem message to the error property for displaying in the table
          failures.push(Object.assign(deployMessage, { error: deployMessage.problem }));
        }
      });
    }
    if (!failures.length) {
      return;
    }
    this.ux.log('');
    this.ux.styledHeader(chalk.red(`Component Failures [${failures.length}]`));
    this.ux.table(failures, {
      problemType: { header: 'Type' },
      fullName: { header: 'Name' },
      error: { header: 'Problem' },
    });
    this.ux.log('');
  }

  private componentsFromFilenames(filenames: string[]): SourceComponent[] {
    const resolver = new MetadataResolver(undefined, VirtualTreeContainer.fromFilePaths(filenames));
    return filenames
      .flatMap((filename) => this.resolveComponentsOrWarn(filename, resolver))
      .filter((cmp) => cmp instanceof SourceComponent);
  }

  private resolveComponentsOrWarn(filename: string, resolver: MetadataResolver): SourceComponent[] {
    try {
      return resolver.getComponentsFromPath(filename);
    } catch (e) {
      this.ux.warn(`unable to resolve ${filename}`);
      return [];
    }
  }
}

export const mergeReplacements = (results: DeployResult[]): DeployResult['replacements'] => {
  const merged = new Map<string, string[]>();
  const replacements = results.filter((result) => result.replacements?.size).map((result) => result.replacements);
  replacements.forEach((replacement) => {
    replacement.forEach((value, key) => {
      if (!merged.has(key)) {
        merged.set(key, value);
      } else {
        merged.set(key, Array.from(new Set([...merged.get(key), ...value])));
      }
    });
  });
  return merged;
};
