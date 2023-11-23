/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { EventEmitter } from 'node:events';
import { MetadataApiDeploy } from '@salesforce/source-deploy-retrieve';
import { spyMethod } from '@salesforce/ts-sinon';
import { assert, expect } from 'chai';
import { Ux } from '@salesforce/sf-plugins-core';
import { TestContext } from '@salesforce/core/lib/testSetup.js';
import { DeployProgressBarFormatter } from '../../../src/formatters/deployProgressBarFormatter.js';
import { ProgressBar } from '../../../src/types.js';

describe('Progress Bar Events', () => {
  const sandbox = new TestContext().SANDBOX;
  const username = 'me@my.org';
  const deploy = new MetadataApiDeploy({ usernameOrConnection: username, id: '123' });
  const progressBarFormatter = new DeployProgressBarFormatter(Ux.prototype);
  let bar: ProgressBar;
  let events: EventEmitter;

  const overrideEvent = (event: EventEmitter) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore the deploy must be listening to the same EventEmitter emitting events
    deploy.event = event;
  };

  const getProgressbar = () =>
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore protected member access
    progressBarFormatter.progressBar;
  afterEach(() => {
    sandbox.restore();
  });

  beforeEach(() => {
    events = new EventEmitter();
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
    expect(bar.value).to.equal(3);
    expect(bar.total).to.equal(5);
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
    expect(bar.total).to.equal(10);
    expect(bar.value).to.equal(3);
    // deploy done, tests running
    events.emit('update', {
      numberComponentsTotal: 10,
      numberComponentsDeployed: 10,
      numberTestsCompleted: 5,
      numberTestsTotal: 10,
    });
    expect(bar.total).to.equal(20);
    expect(bar.value).to.equal(15);
    // all done
    events.emit('finish', {
      response: {
        numberComponentsTotal: 10,
        numberComponentsDeployed: 10,
        numberTestsCompleted: 10,
        numberTestsTotal: 10,
      },
    });
    expect(bar.value).to.equal(20);
  });

  it('should update progress bar when server returns different calculated value', () => {
    events.emit('update', {
      numberComponentsTotal: 20,
      numberComponentsDeployed: 3,
      numberTestsCompleted: 0,
      numberTestsTotal: 0,
    });
    expect(bar.total).to.equal(20);
    expect(bar.value).to.equal(3);
    // deploy done, tests running
    events.emit('update', {
      numberComponentsTotal: 20,
      numberComponentsDeployed: 10,
      numberTestsCompleted: 5,
      numberTestsTotal: 10,
    });
    expect(bar.total).to.equal(30);
    expect(bar.value).to.equal(15);
    // all done - notice 19 comps. deployed
    events.emit('finish', {
      response: {
        numberComponentsTotal: 20,
        numberComponentsDeployed: 19,
        numberTestsCompleted: 10,
        numberTestsTotal: 10,
      },
    });
    expect(bar.value).to.equal(29);
    expect(bar.total).to.equal(29);
  });

  it('should stop progress bar onCancel', () => {
    const stopSpy = spyMethod(sandbox, bar, 'stop');

    events.emit('update', {
      numberComponentsTotal: 10,
      numberComponentsDeployed: 3,
      numberTestsCompleted: 0,
      numberTestsTotal: 0,
    });
    expect(bar.total).to.equal(10);
    expect(bar.value).to.equal(3);

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

    expect(bar.total).to.equal(10);
    expect(bar.value).to.equal(3);

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
