/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Dictionary } from '@salesforce/ts-types';
import { DeployResult } from '@salesforce/source-deploy-retrieve';
import * as sinon from 'sinon';
import { expect } from 'chai';
import { Cancel } from '../../../src/commands/force/source/deploy/cancel';
import { exampleDeployResponse } from './testConsts';

describe('force:source:cancel', () => {
  const jobid = '0Af1k00000r2BebCAE';
  const sandbox = sinon.createSandbox();

  const run = async (
    flags: Dictionary<boolean | string | number | string[]> = {},
    id?: string
  ): Promise<DeployResult> => {
    // TODO: fix this test for SDRL
    // Run the command
    // all the stubs will change with SDRL implementation, just call it good for now
    return Cancel.prototype.run.call({
      flags: Object.assign({}, flags),
      getConfig: () => {
        return { readSync: () => {}, get: () => jobid };
      },
      deployReport: () => exampleDeployResponse,
      org: {
        getConnection: () => {
          return {
            metadata: {
              _invoke: () => {
                return {
                  id: id || jobid,
                };
              },
            },
          };
        },
      },
    }) as Promise<DeployResult>;
  };

  afterEach(() => {
    sandbox.restore();
  });

  it('should read from ~/.sfdx/stash.json', async () => {
    const result = await run({ json: true });
    expect(result).to.deep.equal(exampleDeployResponse);
  });

  it('should use the jobid flag', async () => {
    const jobIdFlag = '0Af1k00000r29C9CAI';
    const result = await run({ json: true, jobid: jobIdFlag }, jobIdFlag);
    expect(result).to.deep.equal(exampleDeployResponse);
  });
});
