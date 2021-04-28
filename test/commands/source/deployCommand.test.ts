/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/* eslint-disable @typescript-eslint/ban-ts-comment */

import * as sinon from 'sinon';
import { expect } from 'chai';
import cli from 'cli-ux';
import { Dictionary } from '@salesforce/ts-types';
import { ProgressBar } from '../../../src/sourceCommand';
import { DeployCommand } from '../../../src/deployCommand';
import { getDeployResult } from './deployResponses';

// TODO: Rewrite tests for this since it no longer displays the progress bar.
describe.skip('DeployCommand', () => {
  const sandbox = sinon.createSandbox();

  class DeployCommandTest extends DeployCommand {
    public async run() {}
    public resolveSuccess() {}
    public formatResult() {}
    public setCmdFlags(flags: Dictionary) {
      this.flags = flags;
    }
  }

  describe('report', () => {
    const pb: ProgressBar = cli.progress({
      format: 'SOURCE PROGRESS | {bar} | {value}/{total} Components',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      linewrap: true,
    }) as ProgressBar;
    let pbStart: sinon.SinonStub;
    let pbStop: sinon.SinonStub;
    let pbUpdate: sinon.SinonStub;
    let initProgressBarStub: sinon.SinonStub;

    const command = new DeployCommandTest([''], null);

    // @ts-ignore
    command.ux = { log: () => {} };
    // @ts-ignore
    command.org = {
      // @ts-ignore
      getConnection: () => {
        return {
          metadata: {
            checkDeployStatus: () => getDeployResult('successSync'),
          },
        };
      },
    };
    command.setCmdFlags({});

    beforeEach(() => {
      initProgressBarStub = sandbox.stub(command, 'initProgressBar').callsFake(() => {
        command.progressBar = pb;
      });
      pbStart = sandbox.stub(pb, 'start');
      pbUpdate = sandbox.stub(pb, 'update');
      pbStop = sandbox.stub(pb, 'stop');
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should "print" the progress bar', async () => {
      const res = await command.report('0Af1h00000fCQgsCAG');
      expect(res).to.deep.equal(getDeployResult('successSync'));
      expect(initProgressBarStub.called).to.be.true;
      expect(pbStart.callCount).to.equal(1);
      expect(pbStop.callCount).to.equal(1);
      expect(pbUpdate.callCount).to.equal(1);
    });

    it('should NOT "print" the progress bar because of --json', async () => {
      command.setCmdFlags({ json: true });
      expect(initProgressBarStub.called).to.be.false;

      const res = await command.report('0Af1h00000fCQgsCAG');
      expect(res).to.deep.equal(getDeployResult('successSync'));
    });

    it('should NOT "print" the progress bar because of env var', async () => {
      try {
        process.env.SFDX_USE_PROGRESS_BAR = 'false';
        const res = await command.report('0Af1h00000fCQgsCAG');
        expect(initProgressBarStub.called).to.be.false;

        expect(res).to.deep.equal(getDeployResult('successSync'));
      } finally {
        delete process.env.SFDX_USE_PROGRESS_BAR;
      }
    });
  });
});
