/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { resolve as pathResolve } from 'path';
import * as chalk from 'chalk';
import { UX } from '@salesforce/command';
import { Logger, Messages, SfdxError } from '@salesforce/core';
import {
  ComponentStatus,
  DeployMessage,
  DeployResult,
  FileResponse,
  MetadataResolver,
  SourceComponent,
  VirtualTreeContainer,
} from '@salesforce/source-deploy-retrieve';
import { isString } from '@salesforce/ts-types';
import { ResultFormatter, ResultFormatterOptions, toArray } from '../resultFormatter';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'push');

export type PushResponse = { pushedSource: Array<Pick<FileResponse, 'filePath' | 'fullName' | 'state' | 'type'>> };

export class PushResultFormatter extends ResultFormatter {
  protected fileResponses: FileResponse[];

  public constructor(
    logger: Logger,
    ux: UX,
    options: ResultFormatterOptions,
    protected results: DeployResult[],
    // if your push included deletes that are bundle subcomponents, we'll need to add those deletes to the results even though they aren't included in fileResponses
    protected deletes: string[] = []
  ) {
    super(logger, ux, options);
    this.fileResponses = this.correctFileResponses();
  }

  /**
   * Get the JSON output from the DeployResult.
   *
   * @returns a JSON formatted result matching the provided type.
   */
  public getJson(): PushResponse {
    // quiet returns only failures
    const toReturn = this.isQuiet()
      ? this.fileResponses.filter((fileResponse) => fileResponse.state === ComponentStatus.Failed)
      : this.fileResponses;

    return {
      pushedSource: toReturn.map(({ state, fullName, type, filePath }) => ({ state, fullName, type, filePath })),
    };
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

    // Throw a DeployFailed error unless the deployment was successful.
    if (!this.isSuccess()) {
      throw new SfdxError(messages.getMessage('sourcepushFailed'), 'PushFailed');
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
      ['LightningComponentBundle', 'AuraDefinitionBundle', 'WaveTemplateBundle'].includes(fileResponse.type)
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
      this.ux.table(successes, {
        columns: [
          { key: 'state', label: 'STATE' },
          { key: 'fullName', label: 'FULL NAME' },
          { key: 'type', label: 'TYPE' },
          { key: 'filePath', label: 'PROJECT PATH' },
        ],
      });
    }
  }

  protected displayFailures(): void {
    const failures: Array<FileResponse | DeployMessage> = [];
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

    const deployMessages = this.results?.flatMap((result) => toArray(result.response?.details?.componentFailures));
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
      columns: [
        { key: 'problemType', label: 'Type' },
        { key: 'fullName', label: 'Name' },
        { key: 'error', label: 'Problem' },
      ],
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
      this.logger.warn(`unable to resolve ${filename}`);
      return [];
    }
  }
}
