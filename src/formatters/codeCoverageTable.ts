/*
 * Copyright 2025, Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { ensureArray } from '@salesforce/kit';
import { Ux } from '@salesforce/sf-plugins-core';
import { CodeCoverage } from '@salesforce/source-deploy-retrieve';
import chalk from 'chalk';
import { prepCoverageForDisplay } from '../coverageUtils.js';

/**
 * prints a table of formatted code coverage results if there are any
 * This is a no-op if tests didn't run or there is no coverage
 *
 * @param coverageFromMdapiResult
 * @param ux
 */
export const maybePrintCodeCoverageTable = (
  coverageFromMdapiResult: CodeCoverage | CodeCoverage[] | undefined,
  ux: Ux
): void => {
  const codeCoverage = ensureArray(coverageFromMdapiResult);

  if (codeCoverage.length) {
    const coverage = prepCoverageForDisplay(codeCoverage);

    ux.log('');
    ux.styledHeader(chalk.blue('Apex Code Coverage'));

    ux.table(
      coverage.map((entry) => ({
        name: entry.name,
        numLocations: entry.numLocations,
        lineNotCovered: entry.lineNotCovered,
      })),
      {
        name: { header: 'Name' },
        numLocations: { header: '% Covered' },
        lineNotCovered: { header: 'Uncovered Lines' },
      }
    );
  }
};
