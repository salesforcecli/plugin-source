/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import * as fs from 'fs';
import {
  AsyncResult,
  ComponentSet,
  DeployResult,
  MetadataApiDeploy,
  MetadataApiDeployStatus,
  RequestStatus,
} from '@salesforce/source-deploy-retrieve';
import { Messages, PollingClient, SfdxPropertyKeys, SfError, StatusResult } from '@salesforce/core';
import { AnyJson, getBoolean, isString } from '@salesforce/ts-types';
import { Duration, once, ensureArray } from '@salesforce/kit';
import {
  CoverageReporter,
  CoverageReporterOptions,
  CoverageReportFormats,
  DefaultReportOptions,
  JUnitReporter,
} from '@salesforce/apex-node';
import { SourceCommand } from './sourceCommand';
import { DeployData, Stash } from './stash';
import { transformCoverageToApexCoverage, transformDeployTestsResultsToTestResult } from './coverageUtils';

export type TestLevel = 'NoTestRun' | 'RunSpecifiedTests' | 'RunLocalTests' | 'RunAllTestsInOrg';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.load('@salesforce/plugin-source', 'deployCommand', [
  'invalidDeployId',
  'MissingDeployId',
  'resultsDirMissing',
]);
export const reportsFormatters = Object.keys(DefaultReportOptions);

export abstract class DeployCommand extends SourceCommand {
  protected displayDeployId = once((id: string) => {
    if (!this.jsonEnabled()) {
      this.log(`Deploy ID: ${id}`);
    }
  });

  protected isRest = false;
  protected isAsync = false;
  protected asyncDeployResult: AsyncResult;

  protected deployResult: DeployResult;
  protected resultsDir: string;
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
      throw new SfError(messages.getMessage('invalidDeployId'), 'invalidDeployId');
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
        throw new SfError(messages.getMessage('MissingDeployId'));
      }
      return stash.jobid;
    }
  }

  // SOAP is the default unless:
  //   1. SOAP is specified with the soapdeploy flag on the command
  //   2. The restDeploy SFDX config setting is explicitly true.
  protected isRestDeploy(): boolean {
    if (getBoolean(this.flags, 'soapdeploy') === true) {
      this.logger.debug('soapdeploy flag === true.  Using SOAP');
      return false;
    }

    const restDeployConfig = this.configAggregator.getInfo(SfdxPropertyKeys.REST_DEPLOY).value;
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
    const waitFlag = this.flags.wait;
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

  protected maybeCreateRequestedReports(): void {
    // only generate reports if test results are present
    if (this.deployResult.response?.numberTestsTotal) {
      if (this.Flags.coverageformatters) {
        createCoverageReport(this.deployResult, this.Flags.coverageformatters as string[], 'no-map', this.resultsDir);
      }
      if (this.Flags.junit) {
        this.createJunitResults(this.deployResult);
      }
    }
  }

  protected createJunitResults(deployResult: DeployResult): void {
    const testResult = transformDeployTestsResultsToTestResult(
      this.org.getConnection(),
      deployResult.response?.details?.runTestResult
    );
    if (testResult.summary.testsRan > 0) {
      const jUnitReporter = new JUnitReporter();
      const junitResults = jUnitReporter.format(testResult);

      const junitReportPath = path.join(this.resultsDir, 'junit');
      fs.mkdirSync(junitReportPath, { recursive: true });
      fs.writeFileSync(path.join(junitReportPath, 'junit.xml'), junitResults, 'utf8');
    }
  }

  // eslint-disable-next-line class-methods-use-this
  protected resolveOutputDir(
    coverageFormatters: string[],
    junit: boolean,
    resultsDir: string,
    deployId: string,
    noThrow: boolean
  ): string {
    if (resultsDir) {
      return resultsDir;
    }
    if (coverageFormatters || junit) {
      if (deployId) {
        return deployId;
      }
      if (!noThrow) {
        throw new SfError(messages.getMessage('resultsDirMissing'));
      }
    }
    return undefined;
  }
}

export const createCoverageReport = (
  deployResult: DeployResult,
  formatters: string[],
  sourceDir: string,
  resultsDir: string
): void => {
  const apexCoverage = transformCoverageToApexCoverage(
    ensureArray(deployResult.response?.details?.runTestResult?.codeCoverage)
  );
  fs.mkdirSync(resultsDir, { recursive: true });
  const options = getCoverageFormattersOptions(formatters);
  const coverageReport = new CoverageReporter(apexCoverage, resultsDir, sourceDir, options);
  coverageReport.generateReports();
};
export const getCoverageFormattersOptions = (formatters: string[] = []): CoverageReporterOptions => {
  const reportFormats = formatters as CoverageReportFormats[];
  const reportOptions = Object.fromEntries(
    reportFormats.map((format) => {
      const formatDefaults = DefaultReportOptions[format];
      return [
        format,
        {
          ...formatDefaults,
          // always join any subdir from the defaults with our custom coverage dir
          ...('subdir' in formatDefaults ? { subdir: path.join('coverage', formatDefaults.subdir) } : {}),
          // if there is no subdir, we also put the file in the coverage dir, otherwise leave it alone
          ...('file' in formatDefaults && !('subdir' in formatDefaults)
            ? { file: path.join('coverage', formatDefaults.file) }
            : {}),
        },
      ];
    })
  );
  return {
    reportFormats,
    reportOptions,
  };
};
