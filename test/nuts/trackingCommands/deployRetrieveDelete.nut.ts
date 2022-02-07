/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import { expect } from 'chai';
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { ComponentStatus } from '@salesforce/source-deploy-retrieve';
import { replaceRenamedCommands } from '@salesforce/source-tracking';
import { StatusResult } from '../../../src/formatters/source/statusFormatter';
import { RetrieveCommandResult } from '../../../src/formatters/retrieveResultFormatter';
import { DeployCommandResult } from '../../../src/formatters/deployResultFormatter';

let session: TestSession;
describe('-t flag for deploy, retrieve, and delete', () => {
  before(async () => {
    session = await TestSession.create({
      project: {
        gitClone: 'https://github.com/salesforcecli/sample-project-multiple-packages.git',
      },
      setupCommands: [`sfdx force:org:create -d 1 -s -f ${path.join('config', 'project-scratch-def.json')}`],
    });
  });

  after(async () => {
    await session?.zip(undefined, 'artifacts');
    await session?.clean();
  });

  describe('basic status and deploy', () => {
    it('detects the initial metadata status', () => {
      const result = execCmd<StatusResult[]>(replaceRenamedCommands('force:source:status --json'), {
        ensureExitCode: 0,
      }).jsonOutput.result;
      expect(result).to.be.an.instanceof(Array);
      // the fields should be populated
      expect(result.every((row) => row.type && row.fullName)).to.equal(true);
    });
    it('deploy the initial metadata to the org with tracking', () => {
      const result = execCmd<DeployCommandResult>(
        replaceRenamedCommands('force:source:deploy -p force-app,my-app,foo-bar/app -t --json'),
        {
          ensureExitCode: 0,
        }
      ).jsonOutput.result;
      expect(result.deployedSource).to.be.an.instanceof(Array);
      expect(result.deployedSource, JSON.stringify(result)).to.have.length.greaterThan(10);
      expect(
        result.deployedSource.every((r) => r.state !== ComponentStatus.Failed),
        JSON.stringify(result)
      ).to.equal(true);
    });
    it('sees no local changes (all were committed from deploy), but profile updated in remote', () => {
      const localResult = execCmd<StatusResult[]>(replaceRenamedCommands('force:source:status --json --local'), {
        ensureExitCode: 0,
      }).jsonOutput.result;
      expect(localResult).to.deep.equal([]);

      const remoteResult = execCmd<StatusResult[]>(replaceRenamedCommands('force:source:status --json --remote'), {
        ensureExitCode: 0,
      }).jsonOutput.result;
      expect(remoteResult.some((item) => item.type === 'Profile')).to.equal(true);
    });
  });
  describe('retrieve and status', () => {
    it('can retrieve the remote profile', () => {
      const retrieveResult = execCmd<RetrieveCommandResult>(
        replaceRenamedCommands('force:source:retrieve -m Profile:Admin -t --json'),
        {
          ensureExitCode: 0,
        }
      ).jsonOutput?.result;
      expect(
        retrieveResult.inboundFiles.some((item) => item.type === 'Profile'),
        JSON.stringify(retrieveResult)
      ).to.equal(true);
    });

    it('sees no local or remote changes', () => {
      const result = execCmd<StatusResult[]>(replaceRenamedCommands('force:source:status --json'), {
        ensureExitCode: 0,
      }).jsonOutput.result;
      expect(
        result.filter((r) => r.type === 'Profile'),
        JSON.stringify(result)
      ).to.have.length(0);
    });
  });
  describe('delete', () => {
    it('can delete remote and local metadata with tracking', async () => {
      const result = execCmd<DeployCommandResult>('force:source:delete -m ApexClass:FooBarTest -t --noprompt --json', {
        ensureExitCode: 0,
      }).jsonOutput.result;
      expect(result.deletedSource).to.be.an.instanceof(Array).with.length.greaterThan(0);
      expect(result.deletedSource.every((item) => item.type === 'ApexClass')).to.equal(true);
    });

    it('sees no local or remote changes', () => {
      const result = execCmd<StatusResult[]>(replaceRenamedCommands('force:source:status --json'), {
        ensureExitCode: 0,
      }).jsonOutput.result;
      // this delete WILL change the admin profile, so remove that from the status result
      expect(
        result.filter((r) => r.type === 'ApexClass'),
        JSON.stringify(result)
      ).to.have.length(0);
    });
  });
});
