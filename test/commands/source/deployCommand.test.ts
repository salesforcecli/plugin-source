/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as path from 'path';
import { SfError } from '@salesforce/core';
import { assert, expect } from 'chai';
import { DeployCommand, getCoverageFormattersOptions } from '../../../src/deployCommand';

describe('test static method for valid deploy IDs', () => {
  it('valid deployId returns true', () => {
    expect(DeployCommand.isValidDeployId('0Af000000012345')).to.be.true;
  });

  it('valid deployId throws', () => {
    try {
      DeployCommand.isValidDeployId('00D000000012345');
      assert.fail('should have thrown');
    } catch (e) {
      expect((e as SfError).name).to.equal('invalidDeployId');
    }
  });
});

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
