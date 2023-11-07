/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as path from 'node:path';
import { expect } from 'chai';
import { getCoverageFormattersOptions } from '../../../src/deployCommand';

describe('coverage functions', () => {
  describe('getCoverageFormattersOptions', () => {
    it('clover, json', () => {
      const result = getCoverageFormattersOptions(['clover', 'json']);
      expect(result).to.deep.equal({
        reportFormats: ['clover', 'json'],
        reportOptions: {
          clover: { file: path.join('coverage', 'clover.xml'), projectRoot: '.' },
          json: { file: path.join('coverage', 'coverage.json') },
        },
      });
    });

    it('teamcity', () => {
      const result = getCoverageFormattersOptions(['teamcity']);
      expect(result).to.deep.equal({
        reportFormats: ['teamcity'],
        reportOptions: {
          teamcity: { file: path.join('coverage', 'teamcity.txt'), blockName: 'coverage' },
        },
      });
    });
  });
});
