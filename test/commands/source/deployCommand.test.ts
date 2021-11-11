/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { ComponentSet } from '@salesforce/source-deploy-retrieve';
import { expect } from 'chai';
import { getVersionMessage } from '../../../src/deployCommand';

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
