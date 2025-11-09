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

import sinon from 'sinon';
import { expect } from 'chai';
import { Ux } from '@salesforce/sf-plugins-core';
import { MetadataApiDeploy } from '@salesforce/source-deploy-retrieve';
import { getDeployResult } from '../commands/source/deployResponses.js';
import { DeployProgressStatusFormatter } from '../../src/formatters/deployProgressStatusFormatter.js';

describe('DeployProgressStatusFormatter', () => {
  const sandbox = sinon.createSandbox();
  const deployResultInProgress = getDeployResult('inProgress');
  let ux: Ux;
  let printStub: sinon.SinonStub;
  let mdApiDeploy: MetadataApiDeploy;

  beforeEach(() => {
    mdApiDeploy = new MetadataApiDeploy({ usernameOrConnection: 'test' });

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore  stubbing private method
    printStub = sandbox.stub(DeployProgressStatusFormatter.prototype, 'printDeployStatus');
  });

  afterEach(() => {
    sandbox.restore();
  });

  const fireUpdateEvent = () => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore eslint-disable-next-line
    mdApiDeploy.event.emit('update', deployResultInProgress.response); // eslint-disable-line
  };

  it('should output with every update when verbose', () => {
    const formatter = new DeployProgressStatusFormatter(ux, { verbose: true });
    formatter.progress(mdApiDeploy);

    fireUpdateEvent();
    expect(printStub.calledOnce).to.equal(true);

    fireUpdateEvent();
    expect(printStub.calledTwice).to.equal(true);

    fireUpdateEvent();
    expect(printStub.calledThrice).to.equal(true);
  });

  it('should only output on update when results change without verbose', () => {
    const formatter = new DeployProgressStatusFormatter(ux);
    formatter.progress(mdApiDeploy);

    fireUpdateEvent();
    expect(printStub.calledOnce).to.equal(true);

    fireUpdateEvent();
    expect(printStub.calledOnce).to.equal(true);

    // Now change the deploy results
    deployResultInProgress.response.numberComponentsDeployed++;

    fireUpdateEvent();
    expect(printStub.calledTwice).to.equal(true);
  });
});
