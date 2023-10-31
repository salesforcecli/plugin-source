/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
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
export const maybePrintCodeCoverageTable = (coverageFromMdapiResult: CodeCoverage | CodeCoverage[], ux: Ux): void => {
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
