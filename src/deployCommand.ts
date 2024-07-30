/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import path from 'node:path';
import fs from 'node:fs';

import {
  AsyncResult,
  ComponentSet,
  DeployResult,
  MetadataApiDeploy,
  MetadataApiDeployStatus,
  RequestStatus,
  RunTestResult,
} from '@salesforce/source-deploy-retrieve';
import {
  ConfigAggregator,
  Connection,
  Messages,
  Org,
  PollingClient,
  SfError,
  StateAggregator,
  StatusResult,
} from '@salesforce/core';
import { AnyJson, getBoolean } from '@salesforce/ts-types';
import { Duration, ensureArray, once } from '@salesforce/kit';
import {
  CoverageReporter,
  CoverageReporterOptions,
  CoverageReportFormats,
  DefaultReportOptions,
  JUnitReporter,
} from '@salesforce/apex-node';
import { Flags } from '@salesforce/sf-plugins-core';
import { SourceCommand } from './sourceCommand.js';
import { DeployData, Stash } from './stash.js';
import { transformCoverageToApexCoverage, transformDeployTestsResultsToTestResult } from './coverageUtils.js';

export type TestLevel = 'NoTestRun' | 'RunSpecifiedTests' | 'RunLocalTests' | 'RunAllTestsInOrg';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'deployCommand');
export const reportsFormatters = Object.keys(DefaultReportOptions);

export abstract class DeployCommand extends SourceCommand {
  protected displayDeployId = once((id?: string) => {
    if (!this.jsonEnabled()) {
      this.log(`Deploy ID: ${id}`);
    }
  });

  protected isRest = false;
  protected isAsync = false;
  protected asyncDeployResult: AsyncResult | undefined;
  protected deployResult!: DeployResult;
  protected resultsDir: string | undefined;
  protected updateDeployId = once((id?: string) => {
    this.displayDeployId(id);
    const stashKey = Stash.getKey(this.id as string);
    Stash.set(stashKey, { jobid: id ?? '' });
  });

  /**
   * Request a report of an in-progress or completed deployment.
   *
   * @param conn a Connection to the org
   * @param id the Deploy ID of a deployment request
   * @returns DeployResult
   */
  protected async report(conn: Connection, id?: string): Promise<DeployResult> {
    const deployId = this.resolveDeployId(id);
    this.displayDeployId(deployId);

    const res = await conn.metadata.checkDeployStatus(deployId, true);

    const deployStatus = res as unknown as MetadataApiDeployStatus;
    const componentSet = this.componentSet ?? new ComponentSet();
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
      this.setExitCode(StatusCodeMap.get(this.deployResult?.response?.status) ?? 1);
    }
  }

  /**
   * This method is here to provide a workaround to stubbing a constructor in the tests.
   *
   * @param conn
   * @param id
   */
  // eslint-disable-next-line class-methods-use-this
  protected createDeploy(conn: Connection, id?: string): MetadataApiDeploy {
    return new MetadataApiDeploy({ usernameOrConnection: conn.getUsername() ?? '', id });
  }

  protected resolveDeployId(id?: string): string {
    if (id) {
      return id;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const stash = Stash.get<DeployData>(Stash.getKey(this.id!));
      if (!stash) {
        throw new SfError(messages.getMessage('MissingDeployId'));
      }
      return stash.jobid;
    }
  }

  // SOAP is the default unless:
  //   1. SOAP is specified with the soapdeploy flag on the command
  //   2. The restDeploy SFDX config setting is explicitly true.
  protected isRestDeploy(soapdeploy = true): boolean {
    if (soapdeploy) {
      this.debug('soapdeploy flag === true.  Using SOAP');
      return false;
    }

    const restDeployConfig = this.configAggregator.getInfo('org-metadata-rest-deploy').value;
    // aggregator property values are returned as strings
    if (restDeployConfig === 'false') {
      this.debug('restDeploy SFDX config === false.  Using SOAP');
      return false;
    } else if (restDeployConfig === 'true') {
      this.debug('restDeploy SFDX config === true.  Using REST');
      return true;
    } else {
      this.debug('soapdeploy flag unset. restDeploy SFDX config unset.  Defaulting to SOAP');
    }

    return false;
  }

  protected async poll(
    connection: Connection,
    deployId: string,
    options: Partial<PollingClient.Options> & { wait: Duration } = { wait: Duration.days(7) }
  ): Promise<DeployResult> {
    const waitDuration = options.wait;

    const defaultOptions: PollingClient.Options = {
      frequency: options?.frequency ?? Duration.seconds(1),
      timeout: options?.timeout ?? waitDuration,
      poll: async (): Promise<StatusResult> => {
        const deployResult = await this.report(connection, deployId);
        return {
          completed: getBoolean(deployResult, 'response.done') as boolean,
          payload: deployResult as unknown as AnyJson,
        };
      },
    };
    const pollingOptions = { ...defaultOptions, ...options };
    const pollingClient = await PollingClient.create(pollingOptions);
    return pollingClient.subscribe() as unknown as Promise<DeployResult>;
  }

  protected async deployRecentValidation(id: string, conn: Connection): Promise<DeployResult> {
    const validatedDeployId = await conn.metadata.deployRecentValidation({ id, rest: this.isRest });
    // This is the deploy ID of the deployRecentValidation response, not
    // the already validated deploy ID (i.e., validateddeployrequestid).
    this.updateDeployId(validatedDeployId);
    this.asyncDeployResult = { id: validatedDeployId };

    return this.isAsync ? this.report(conn, validatedDeployId) : this.poll(conn, validatedDeployId);
  }

  protected maybeCreateRequestedReports(options: { coverageformatters: string[]; junit: boolean; org: Org }): void {
    // only generate reports if test results are present
    if (this.deployResult?.response?.numberTestsTotal) {
      if (options.coverageformatters && this.resultsDir) {
        createCoverageReport(this.deployResult, options.coverageformatters, 'no-map', this.resultsDir);
      }
      if (options.junit) {
        this.createJunitResults(this.deployResult, options.org);
      }
    }
  }

  protected createJunitResults(deployResult: DeployResult, org: Org): void {
    const testResult = transformDeployTestsResultsToTestResult(
      org.getConnection(),
      deployResult.response?.details?.runTestResult as RunTestResult
    );
    if (testResult.summary.testsRan > 0 && this.resultsDir) {
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
    resultsDir: string | undefined,
    deployId: string,
    noThrow: boolean
  ): string {
    if (resultsDir) {
      return resultsDir;
    }
    if (coverageFormatters.length || junit) {
      if (deployId) {
        return deployId;
      }
      if (!noThrow) {
        throw new SfError(messages.getMessage('resultsDirMissing'));
      }
    }
    return '';
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

export const targetUsernameFlag = Flags.string({
  required: true,
  char: 'u',
  deprecateAliases: true,
  // DO NOT alias to 'o', it will conflict with '--ignoreerrors'
  aliases: ['targetusername'],
  summary: messages.getMessage('flags.targetusername.summary'),
  parse: async (input: string | undefined) => resolveUsername(input),
  default: async () => resolveUsername(),
  defaultHelp: async () => resolveUsername(),
});

export const resolveUsername = async (usernameOrAlias?: string): Promise<string> => {
  const stateAggregator = await StateAggregator.getInstance();
  // we have a value, but don't know if it's a username or an alias
  if (usernameOrAlias) return stateAggregator.aliases.resolveUsername(usernameOrAlias);
  // we didn't get a value, so let's see if the config has a default target org
  const configAggregator = await ConfigAggregator.create();
  const defaultUsernameOrAlias = configAggregator.getPropertyValue('target-org') as string;
  if (defaultUsernameOrAlias) return stateAggregator.aliases.resolveUsername(defaultUsernameOrAlias);
  throw new SfError(messages.getMessage('missingUsername'), 'MissingUsernameError');
};
