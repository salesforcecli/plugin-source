/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import * as fs from 'fs';
import {
  ComponentSet,
  DeployResult,
  MetadataApiDeploy,
  MetadataApiDeployStatus,
  RequestStatus,
  AsyncResult,
} from '@salesforce/source-deploy-retrieve';
import { ConfigAggregator, Messages, PollingClient, SfdxError, StatusResult } from '@salesforce/core';
import { AnyJson, getBoolean, isString } from '@salesforce/ts-types';
import { Duration, once } from '@salesforce/kit';
import {
  CoverageReporter,
  CoverageReporterOptions,
  CoverageReportFormats,
  DefaultReportOptions,
  JUnitReporter,
} from '@salesforce/apex-node';
import { cloneJson } from '@salesforce/kit';
import { SourceCommand } from './sourceCommand';
import { DeployData, Stash } from './stash';
import { transformCoverageToApexCoverage, transformDeployTestsResultsToTestResult } from './coverageUtils';
// TODO: this function needs to be moved to a shared location
import { toArray } from './formatters/resultFormatter';

export type TestLevel = 'NoTestRun' | 'RunSpecifiedTests' | 'RunLocalTests' | 'RunAllTestsInOrg';

export const reportsFormatters = Object.keys(DefaultReportOptions);

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'deployCommand');

export abstract class DeployCommand extends SourceCommand {
  protected displayDeployId = once((id: string) => {
    if (!this.isJsonOutput()) {
      this.ux.log(`Deploy ID: ${id}`);
    }
  });

  protected isRest = false;
  protected isAsync = false;
  protected asyncDeployResult: AsyncResult;

  protected deployResult: DeployResult;
  protected updateDeployId = once((id: string) => {
    this.displayDeployId(id);
    const stashKey = Stash.getKey(this.id);
    Stash.set(stashKey, { jobid: id });
  });

  // the basic sfdx flag is already making sure its of the correct length
  public static isValidDeployId = (id: string): boolean => {
    if (id.startsWith('0Af')) {
      return true;
    } else {
      throw SfdxError.create('@salesforce/plugin-source', 'deploy', 'invalidDeployId');
    }
  };
  /**
   * Request a report of an in-progress or completed deployment.
   *
   * @param id the Deploy ID of a deployment request
   * @returns DeployResult
   */
  protected async report(id?: string): Promise<DeployResult> {
    const deployId = this.resolveDeployId(id);
    this.displayDeployId(deployId);

    const res = await this.org.getConnection().metadata.checkDeployStatus(deployId, true);

    const deployStatus = res as unknown as MetadataApiDeployStatus;
    const componentSet = this.componentSet || new ComponentSet();
    return new DeployResult(deployStatus, componentSet);
  }

  /**
   * Checks the response status to determine whether the deploy was successful.
   * Async deploys are successful unless an error is thrown, which resolves as
   * unsuccessful in oclif.
   */
  protected resolveSuccess(): void {
    const StatusCodeMap = new Map<RequestStatus, number>([
      [RequestStatus.Succeeded, 0],
      [RequestStatus.Canceled, 1],
      [RequestStatus.Failed, 1],
      [RequestStatus.SucceededPartial, 68],
      [RequestStatus.InProgress, 69],
      [RequestStatus.Pending, 69],
      [RequestStatus.Canceling, 69],
    ]);
    if (!this.isAsync) {
      this.setExitCode(StatusCodeMap.get(this.deployResult.response?.status) ?? 1);
    }
  }

  /**
   * This method is here to provide a workaround to stubbing a constructor in the tests.
   *
   * @param id
   */
  protected createDeploy(id?: string): MetadataApiDeploy {
    return new MetadataApiDeploy({ usernameOrConnection: this.org.getUsername(), id });
  }

  protected resolveDeployId(id?: string): string {
    if (id) {
      return id;
    } else {
      const stash = Stash.get<DeployData>(Stash.getKey(this.id));
      if (!stash) {
        throw SfdxError.create('@salesforce/plugin-source', 'deploy', 'MissingDeployId');
      }
      return stash.jobid;
    }
  }

  // REST is the default unless:
  //   1. SOAP is specified with the soapdeploy flag on the command
  //   2. The restDeploy SFDX config setting is explicitly false.
  protected async isRestDeploy(): Promise<boolean> {
    if (getBoolean(this.flags, 'soapdeploy') === true) {
      this.logger.debug('soapdeploy flag === true.  Using SOAP');
      return false;
    }

    const aggregator = await ConfigAggregator.create();
    const restDeployConfig = aggregator.getPropertyValue('restDeploy');
    // aggregator property values are returned as strings
    if (restDeployConfig === 'false') {
      this.logger.debug('restDeploy SFDX config === false.  Using SOAP');
      return false;
    } else if (restDeployConfig === 'true') {
      this.logger.debug('restDeploy SFDX config === true.  Using REST');
      return true;
    } else {
      this.logger.debug('soapdeploy flag unset. restDeploy SFDX config unset.  Defaulting to SOAP');
    }

    return false;
  }

  protected async poll(deployId: string, options?: Partial<PollingClient.Options>): Promise<DeployResult> {
    const waitFlag = this.getFlag<Duration>('wait');
    const waitDuration = waitFlag.minutes === -1 ? Duration.days(7) : waitFlag;

    const defaultOptions: PollingClient.Options = {
      frequency: options?.frequency ?? Duration.seconds(1),
      timeout: options?.timeout ?? waitDuration,
      poll: async (): Promise<StatusResult> => {
        const deployResult = await this.report(deployId);
        return {
          completed: getBoolean(deployResult, 'response.done'),
          payload: deployResult as unknown as AnyJson,
        };
      },
    };
    const pollingOptions = { ...defaultOptions, ...options };
    const pollingClient = await PollingClient.create(pollingOptions);
    return pollingClient.subscribe() as unknown as Promise<DeployResult>;
  }

  protected async deployRecentValidation(): Promise<DeployResult> {
    const id = this.getFlag<string>('validateddeployrequestid');
    const response = await this.org.getConnection().deployRecentValidation({ id, rest: this.isRest });
    // This is the deploy ID of the deployRecentValidation response, not
    // the already validated deploy ID (i.e., validateddeployrequestid).
    // REST returns an object with an ID, SOAP returns the id as a string.
    const validatedDeployId = isString(response) ? response : (response as { id: string }).id;
    this.updateDeployId(validatedDeployId);
    this.asyncDeployResult = { id: validatedDeployId };

    return this.isAsync ? this.report(validatedDeployId) : this.poll(validatedDeployId);
  }

  protected createRequestedReports(): void {
    if (this.flags.coverageformatters) {
      this.createCoverageReport(this.deployResult, this.flags.coverageformatters, 'no-map', this.flags.outputdir);
    }
    if (this.flags.junit && !this.isAsync) {
      this.createJunitResults(this.deployResult);
    }
  }

  protected createCoverageReport(
    deployResult: DeployResult,
    formatters: string[],
    sourceDir: string,
    outputDir: string
  ): void {
    const apexCoverage = transformCoverageToApexCoverage(
      toArray(deployResult.response?.details?.runTestResult?.codeCoverage)
    );
    fs.mkdirSync(outputDir, { recursive: true });
    const options = this.getCoverageFormattersOptions(formatters);
    const coverageReport = new CoverageReporter(apexCoverage, outputDir, sourceDir, options);
    coverageReport.generateReports();
  }

  protected getCoverageFormattersOptions(formatters: string[] = []): CoverageReporterOptions {
    /* eslint-disable @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment */
    const options = {} as CoverageReporterOptions;
    // set requested report formats
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    options.reportFormats = formatters as CoverageReportFormats[];
    // set report options to default report options for each format
    options.reportOptions = Object.fromEntries(
      options.reportFormats.map((format) => {
        const reportOptions = cloneJson(DefaultReportOptions[format as string]);
        const keys = Object.keys(reportOptions);
        if (keys.includes('file')) {
          reportOptions['file'] = reportOptions['file'] as string;
          if (!keys.includes('subdir')) {
            reportOptions['file'] = path.join('coverage', reportOptions['file']);
          }
        }
        if (keys.includes('subdir')) {
          reportOptions['subdir'] = path.join('coverage', reportOptions['subdir'] as string);
        }
        return [format, reportOptions];
      })
    );
    return options;
    /* eslint-enable @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment */
  }

  protected createJunitResults(deployResult: DeployResult): void {
    const testResult = transformDeployTestsResultsToTestResult(
      this.org.getConnection(),
      deployResult.response?.details?.runTestResult
    );
    const jUnitReporter = new JUnitReporter();
    const junitResults = jUnitReporter.format(testResult);

    const junitReportPath = path.join(this.flags.outputdir, 'junit');
    fs.mkdirSync(junitReportPath, { recursive: true });
    fs.writeFileSync(path.join(junitReportPath, 'junit.xml'), junitResults, 'utf8');
  }

  protected resolveOutputDir(
    coverageFormatters: string[],
    junit: boolean,
    outputDir: string,
    deployId: string
  ): string {
    if (!coverageFormatters && !junit) {
      return outputDir;
    }
    if ((coverageFormatters || junit) && !outputDir && deployId) {
      return deployId;
    }
    throw new SfdxError(messages.getMessage('outputDirMissing'));
  }
}

export const getVersionMessage = (
  action: 'Deploying' | 'Pushing',
  componentSet: ComponentSet,
  isRest: boolean
): string => {
  // commands pass in the.componentSet, which may not exist in some tests or mdapi deploys
  if (!componentSet) {
    return `*** ${action} with ${isRest ? 'REST' : 'SOAP'} ***`;
  }
  // neither
  if (!componentSet.sourceApiVersion && !componentSet.apiVersion) {
    return `*** ${action} with ${isRest ? 'REST' : 'SOAP'} ***`;
  }
  // either OR both match (SDR will use either)
  if (
    !componentSet.sourceApiVersion ||
    !componentSet.apiVersion ||
    componentSet.sourceApiVersion === componentSet.apiVersion
  ) {
    return `*** ${action} with ${isRest ? 'REST' : 'SOAP'} API v${
      componentSet.apiVersion ?? componentSet.sourceApiVersion
    } ***`;
  }
  // has both but they don't match
  return `*** ${action} v${componentSet.sourceApiVersion} metadata with ${isRest ? 'REST' : 'SOAP'} API v${
    componentSet.apiVersion
  } connection ***`;
};
