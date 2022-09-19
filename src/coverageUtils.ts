/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { CodeCoverage, Failures, RunTestResult, Successes } from '@salesforce/source-deploy-retrieve';
import * as chalk from 'chalk';
import {
  ApexCodeCoverageAggregate,
  ApexCodeCoverageAggregateRecord,
  ApexTestResultData,
  ApexTestResultOutcome,
  CodeCoverageResult,
  TestResult,
} from '@salesforce/apex-node';
import { Connection } from '@salesforce/core';
import { ensureArray } from '@salesforce/kit';

type SuccessOrFailure = Successes & Failures;

function mapTestResults(testResults: Failures[] | Successes[]): ApexTestResultData[] {
  return testResults.map((successOrFailure) => {
    const testResult = successOrFailure as SuccessOrFailure;
    return {
      apexClass: { fullName: testResult.name, id: testResult.id, name: testResult.name, namespacePrefix: '' },
      apexLogId: '',
      asyncApexJobId: '',
      fullName: testResult.name,
      id: testResult.id,
      message: testResult.message ?? '',
      methodName: testResult.methodName,
      outcome: !testResult.message ? ApexTestResultOutcome.Pass : ApexTestResultOutcome.Fail,
      queueItemId: '',
      runTime: parseInt(testResult.time, 10),
      stackTrace: testResult.stackTrace || '',
      testTimestamp: '',
    };
  });
}

export function prepCoverageForDisplay(codeCoverage: CodeCoverage[]): CodeCoverage[] {
  const coverage = codeCoverage.sort((a, b) => (a.name.toUpperCase() > b.name.toUpperCase() ? 1 : -1));

  coverage.forEach((cov: CodeCoverage & { lineNotCovered: string }) => {
    const numLocationsNum = parseInt(cov.numLocations, 10);
    const numLocationsNotCovered = parseInt(cov.numLocationsNotCovered, 10);
    const color = numLocationsNotCovered > 0 ? chalk.red : chalk.green;

    const coverageDecimal = parseFloat(((numLocationsNum - numLocationsNotCovered) / numLocationsNum).toFixed(2));
    const pctCovered = numLocationsNum > 0 ? coverageDecimal * 100 : 100;
    cov.numLocations = color(`${pctCovered}%`);

    cov.lineNotCovered = cov.locationsNotCovered
      ? ensureArray(cov.locationsNotCovered)
          .map((location) => location.line)
          .join(',')
      : '';
  });
  return coverage;
}

function generateCoveredLines(cov: CodeCoverage): [number[], number[]] {
  const numCovered = parseInt(cov.numLocations, 10);
  const numUncovered = parseInt(cov.numLocationsNotCovered, 10);
  const uncoveredLines = ensureArray(cov.locationsNotCovered).map((location) => parseInt(location.line, 10));
  const minLineNumber = uncoveredLines.length ? Math.min(...uncoveredLines) : 1;
  const lines = [...Array(numCovered + numUncovered).keys()].map((i) => i + minLineNumber);
  const coveredLines = lines.filter((line) => !uncoveredLines.includes(line));
  return [uncoveredLines, coveredLines];
}

export function transformCoverageToApexCoverage(mdCoverage: CodeCoverage[]): ApexCodeCoverageAggregate {
  const apexCoverage = mdCoverage.map((cov) => {
    const numCovered = parseInt(cov.numLocations, 10);
    const numUncovered = parseInt(cov.numLocationsNotCovered, 10);
    const [uncoveredLines, coveredLines] = generateCoveredLines(cov);

    const ac: ApexCodeCoverageAggregateRecord = {
      ApexClassOrTrigger: {
        Id: cov.id,
        Name: cov.name,
      },
      NumLinesCovered: numCovered,
      NumLinesUncovered: numUncovered,
      Coverage: {
        coveredLines,
        uncoveredLines,
      },
    };
    return ac;
  });
  return { done: true, totalSize: apexCoverage.length, records: apexCoverage };
}

export function transformDeployTestsResultsToTestResult(
  connection: Connection,
  runTestResult: RunTestResult
): TestResult {
  const numTestsRun = parseInt(runTestResult.numTestsRun, 10);
  const numTestFailures = parseInt(runTestResult.numFailures, 10);
  const testResult: TestResult = {
    summary: {
      commandTimeInMs: 0,
      failRate: ((numTestFailures / numTestsRun) * 100).toFixed(2) + '%',
      failing: numTestFailures,
      hostname: connection.getConnectionOptions().instanceUrl,
      orgId: connection.getAuthInfoFields().orgId,
      outcome: '',
      passRate: numTestFailures === 0 ? '100%' : ((1 - numTestFailures / numTestsRun) * 100).toFixed(2) + '%',
      passing: numTestsRun - numTestFailures,
      skipRate: '',
      skipped: 0,
      testExecutionTimeInMs: parseFloat(runTestResult.totalTime),
      testRunId: '',
      testStartTime: new Date().toISOString(),
      testTotalTimeInMs: parseFloat(runTestResult.totalTime),
      testsRan: numTestsRun,
      userId: connection.getConnectionOptions().userId,
      username: connection.getUsername(),
    },
    tests: [
      ...mapTestResults(ensureArray(runTestResult.successes)),
      ...mapTestResults(ensureArray(runTestResult.failures)),
    ],
    codecoverage: ensureArray(runTestResult?.codeCoverage).map((cov) => {
      const codeCoverageResult: CodeCoverageResult = {} as CodeCoverageResult;
      codeCoverageResult.apexId = cov.id;
      codeCoverageResult.name = cov.name;
      codeCoverageResult.numLinesUncovered = parseInt(cov.numLocationsNotCovered, 10);
      codeCoverageResult.numLinesCovered = parseInt(cov.numLocations, 10) - codeCoverageResult.numLinesUncovered;
      const [uncoveredLines, coveredLines] = generateCoveredLines(cov);
      codeCoverageResult.coveredLines = coveredLines;
      codeCoverageResult.uncoveredLines = uncoveredLines;
      const numLocationsNum = parseInt(cov.numLocations, 10);
      const numLocationsNotCovered: number = parseInt(cov.numLocationsNotCovered, 10);

      codeCoverageResult.percentage =
        numLocationsNum > 0
          ? (((numLocationsNum - numLocationsNotCovered) / numLocationsNum) * 100).toFixed() + '%'
          : '';
      return codeCoverageResult;
    }),
  };
  return testResult;
}
