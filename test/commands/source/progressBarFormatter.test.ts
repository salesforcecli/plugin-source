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
import { EventEmitter } from 'node:events';
import { MetadataApiDeploy } from '@salesforce/source-deploy-retrieve';
import { spyMethod } from '@salesforce/ts-sinon';
import { assert, expect } from 'chai';
import { TestContext } from '@salesforce/core/testSetup';
import { SingleBar } from 'cli-progress';
import { DeployProgressBarFormatter } from '../../../src/formatters/deployProgressBarFormatter.js';

describe('Progress Bar Events', () => {
  const sandbox = new TestContext().SANDBOX;
  const username = 'me@my.org';
  const deploy = new MetadataApiDeploy({ usernameOrConnection: username, id: '123' });
  let progressBarFormatter: DeployProgressBarFormatter;
  let bar: SingleBar;
  let events: EventEmitter;

  const overrideEvent = (event: EventEmitter) => {
    // @ts-expect-error the deploy must be listening to the same EventEmitter emitting events
    deploy.event = event;
  };

  // @ts-expect-error protected member access
  const getProgressbar = () => progressBarFormatter.progressBar;

  afterEach(() => {
    sandbox.restore();
  });

  beforeEach(() => {
    events = new EventEmitter();
    progressBarFormatter = new DeployProgressBarFormatter();
    overrideEvent(events);
    progressBarFormatter.progress(deploy);
    bar = getProgressbar();
  });

  it('should start the progress bar only once with data onUpdate', () => {
    events.emit('update', {
      numberComponentsTotal: 5,
      numberComponentsDeployed: 3,
      numberTestsCompleted: 0,
      numberTestsTotal: 0,
    });
    expect(bar.getTotal()).to.equal(5);
    expect(bar.getProgress()).to.equal(3 / 5);
    events.emit('finish', {
      response: {
        numberComponentsTotal: 5,
        numberComponentsDeployed: 5,
        numberTestsCompleted: 0,
        numberTestsTotal: 0,
      },
    });
  });

  it('should update progress bar with data onUpdate, update once tests are calculated, update onFinish', () => {
    events.emit('update', {
      numberComponentsTotal: 10,
      numberComponentsDeployed: 3,
      numberTestsCompleted: 0,
      numberTestsTotal: 0,
    });
    expect(bar.getTotal()).to.equal(10);
    expect(bar.getProgress()).to.equal(3 / 10);
    // deploy done, tests running
    events.emit('update', {
      numberComponentsTotal: 10,
      numberComponentsDeployed: 10,
      numberTestsCompleted: 5,
      numberTestsTotal: 10,
    });
    expect(bar.getTotal()).to.equal(20);
    expect(bar.getProgress()).to.equal(15 / 20);
    // all done
    events.emit('finish', {
      response: {
        numberComponentsTotal: 10,
        numberComponentsDeployed: 10,
        numberTestsCompleted: 10,
        numberTestsTotal: 10,
      },
    });
    expect(bar.getProgress()).to.equal(20 / 20);
  });

  it('should update progress bar when server returns different calculated value', () => {
    events.emit('update', {
      numberComponentsTotal: 20,
      numberComponentsDeployed: 3,
      numberTestsCompleted: 0,
      numberTestsTotal: 0,
    });
    expect(bar.getTotal()).to.equal(20);
    expect(bar.getProgress()).to.equal(3 / 20);
    // deploy done, tests running
    events.emit('update', {
      numberComponentsTotal: 20,
      numberComponentsDeployed: 10,
      numberTestsCompleted: 5,
      numberTestsTotal: 10,
    });
    expect(bar.getTotal()).to.equal(30);
    expect(bar.getProgress()).to.equal(15 / 30);
    // all done - notice 19 comps. deployed
    events.emit('finish', {
      response: {
        numberComponentsTotal: 20,
        numberComponentsDeployed: 19,
        numberTestsCompleted: 10,
        numberTestsTotal: 10,
      },
    });
    expect(bar.getProgress()).to.equal(29 / 29);
    expect(bar.getTotal()).to.equal(29);
  });

  it('should stop progress bar onCancel', () => {
    const stopSpy = spyMethod(sandbox, bar, 'stop');

    events.emit('update', {
      numberComponentsTotal: 10,
      numberComponentsDeployed: 3,
      numberTestsCompleted: 0,
      numberTestsTotal: 0,
    });
    expect(bar.getTotal()).to.equal(10);
    expect(bar.getProgress()).to.equal(3 / 10);

    events.emit('cancel');
    expect(stopSpy.calledOnce).to.be.true;
  });

  it('should stop progress bar onError', () => {
    const stopSpy = spyMethod(sandbox, bar, 'stop');

    events.emit('update', {
      numberComponentsTotal: 10,
      numberComponentsDeployed: 3,
      numberTestsCompleted: 0,
      numberTestsTotal: 0,
    });

    expect(bar.getTotal()).to.equal(10);
    expect(bar.getProgress()).to.equal(3 / 10);

    try {
      events.emit('error', new Error('error on deploy'));
      assert.fail('the above should throw an error');
    } catch (e) {
      const err = e as Error;
      expect(err.message).to.equal('error on deploy');
    }
    expect(stopSpy.calledOnce).to.be.true;
  });
});
