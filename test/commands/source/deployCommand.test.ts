/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as path from 'path';
import { SfError } from '@salesforce/core';
import { ComponentSet } from '@salesforce/source-deploy-retrieve';
import { assert, expect } from 'chai';
import { getVersionMessage, DeployCommand, getCoverageFormattersOptions } from '../../../src/deployCommand';

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

describe('various version formatting options', () => {
  it('returns basic response when nothing set', () => {
    // SDR will get the apiVersion from the componentSet registry default when nothing is provided
    expect(getVersionMessage('Pushing', new ComponentSet(), true).startsWith('*** Pushing with REST API v'));
  });
  it('returns correct response for Deploying, SOAP, and apiVersion', () => {
    const CS = new ComponentSet();
    CS.apiVersion = '52.0';
    expect(getVersionMessage('Deploying', CS, false)).to.equal('*** Deploying with SOAP API v52.0 ***');
  });
  it('handles differing APIs versions', () => {
    const CS = new ComponentSet();
    CS.apiVersion = '52.0';
    CS.sourceApiVersion = '51.0';
    expect(getVersionMessage('Pushing', CS, true)).to.equal(
      '*** Pushing v51.0 metadata with REST API v52.0 connection ***'
    );
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
