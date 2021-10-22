/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/* eslint-disable no-console */

import * as path from 'path';
import * as fs from 'fs';
import { expect } from 'chai';
import * as shelljs from 'shelljs';
import { TestSession, execCmd } from '@salesforce/cli-plugins-testkit';
import { ComponentStatus } from '@salesforce/source-deploy-retrieve';
import { replaceRenamedCommands } from '@salesforce/source-tracking';
import { PushResponse } from '../../../src/formatters/pushResultFormatter';
import { StatusResult } from '../../../src/formatters/statusFormatter';
import { PullResponse } from '../../../src/formatters/pullFormatter';

let session: TestSession;
describe('end-to-end-test for tracking with an org (single packageDir)', () => {
  before(async () => {
    session = await TestSession.create({
      project: {
        gitClone: 'https://github.com/trailheadapps/ebikes-lwc',
      },
      setupCommands: [
        'git checkout 652b954921f51c79371c224760dd5bdf6a277db5',
        `sfdx force:org:create -d 1 -s -f ${path.join('config', 'project-scratch-def.json')}`,
      ],
    });

    // we also need to remove profiles from the forceignore
    const originalForceIgnore = await fs.promises.readFile(path.join(session.project.dir, '.forceignore'), 'utf8');
    const newForceIgnore = originalForceIgnore.replace('**/profiles/**', '');
    await fs.promises.writeFile(path.join(session.project.dir, '.forceignore'), newForceIgnore);
  });

  after(async () => {
    await session?.zip(undefined, 'artifacts');
    await session?.clean();
  });

  describe('basic status and pull', () => {
    it('detects the initial metadata status', () => {
      const result = execCmd<StatusResult[]>(replaceRenamedCommands('force:source:status --json'), {
        ensureExitCode: 0,
      }).jsonOutput.result;
      expect(result).to.be.an.instanceof(Array);
      // the fields should be populated
      expect(result.every((row) => row.type && row.fullName)).to.equal(true);
    });
    it('pushes the initial metadata to the org', () => {
      const result = execCmd<PushResponse[]>(replaceRenamedCommands('force:source:push --json'), {
        ensureExitCode: 0,
      }).jsonOutput.result;
      expect(result).to.be.an.instanceof(Array);
      expect(result, JSON.stringify(result)).to.have.lengthOf(234);
      expect(
        result.every((r) => r.state !== ComponentStatus.Failed),
        JSON.stringify(result)
      ).to.equal(true);
    });
    it('sees no local changes (all were committed from push), but profile updated in remote', () => {
      const localResult = execCmd<StatusResult[]>(replaceRenamedCommands('force:source:status --json --local'), {
        ensureExitCode: 0,
      }).jsonOutput.result;
      expect(localResult).to.deep.equal([]);

      const remoteResult = execCmd<StatusResult[]>(replaceRenamedCommands('force:source:status --json --remote'), {
        ensureExitCode: 0,
      }).jsonOutput.result;
      expect(remoteResult.some((item) => item.type === 'Profile')).to.equal(true);
    });

    it('can pull the remote profile', () => {
      const pullResult = execCmd<PullResponse[]>(replaceRenamedCommands('force:source:pull --json'), {
        ensureExitCode: 0,
      }).jsonOutput.result;
      expect(
        pullResult.some((item) => item.type === 'Profile'),
        JSON.stringify(pullResult)
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

    it('sees a local delete in local status', async () => {
      const classDir = path.join(session.project.dir, 'force-app', 'main', 'default', 'classes');
      await Promise.all([
        fs.promises.unlink(path.join(classDir, 'TestOrderController.cls')),
        fs.promises.unlink(path.join(classDir, 'TestOrderController.cls-meta.xml')),
      ]);
      const result = execCmd<StatusResult[]>(replaceRenamedCommands('force:source:status --json --local'), {
        ensureExitCode: 0,
      }).jsonOutput.result;
      expect(result).to.deep.equal([
        {
          type: 'ApexClass',
          state: 'Local Deleted',
          fullName: 'TestOrderController',
          filePath: path.normalize('force-app/main/default/classes/TestOrderController.cls'),
          ignored: false,
          actualState: 'Deleted',
          origin: 'Local',
        },
        {
          type: 'ApexClass',
          state: 'Local Deleted',
          fullName: 'TestOrderController',
          filePath: path.normalize('force-app/main/default/classes/TestOrderController.cls-meta.xml'),
          ignored: false,
          actualState: 'Deleted',
          origin: 'Local',
        },
      ]);
    });
    it('does not see any change in remote status', () => {
      const result = execCmd<StatusResult[]>(replaceRenamedCommands('force:source:status --json --remote'), {
        ensureExitCode: 0,
      }).jsonOutput.result;
      expect(
        result.filter((r) => r.fullName === 'TestOrderController'),
        JSON.stringify(result)
      ).to.have.length(0);
    });

    it('pushes the local delete to the org', () => {
      const result = execCmd<PushResponse[]>(replaceRenamedCommands('force:source:push --json'), {
        ensureExitCode: 0,
      }).jsonOutput.result;
      expect(result, JSON.stringify(result)).to.be.an.instanceof(Array).with.length(2);
    });
    it('sees no local changes', () => {
      const result = execCmd<StatusResult[]>(replaceRenamedCommands('force:source:status --json --local'), {
        ensureExitCode: 0,
      }).jsonOutput.result;
      expect(result, JSON.stringify(result)).to.be.an.instanceof(Array).with.length(0);
    });
  });

  describe('non-successes', () => {
    it('should throw an err when attempting to pull from a non scratch-org', () => {
      const hubUsername = (
        JSON.parse(shelljs.exec('sfdx force:config:get defaultdevhubusername --json')) as {
          result: [{ location: string; value: string }];
        }
      ).result.find((config) => config.location === 'Local').value;
      const failure = execCmd(replaceRenamedCommands(`force:source:status -u ${hubUsername} --remote --json`), {
        ensureExitCode: 1,
      }).jsonOutput as unknown as { name: string };
      expect(failure.name).to.equal('NonSourceTrackedOrgError');
    });

    describe('push failures', () => {
      it('writes a bad class', async () => {
        const classdir = path.join(session.project.dir, 'force-app', 'main', 'default', 'classes');
        // add a file in the local source
        await Promise.all([
          fs.promises.writeFile(path.join(classdir, 'badClass.cls'), 'bad'),
          fs.promises.writeFile(
            path.join(classdir, 'badClass.cls-meta.xml'),
            `<?xml version="1.0" encoding="UTF-8"?>
<ApexClass xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>53.0</apiVersion>
</ApexClass>`
          ),
        ]);
      });
      it('fails to push', () => {
        const result = execCmd<PushResponse[]>(replaceRenamedCommands('force:source:push --json'), {
          ensureExitCode: 1,
        }).jsonOutput.result;
        expect(result.every((r) => r.type === 'ApexClass' && r.state === 'Failed')).to.equal(true);
      });
      it('classes that failed to deploy are still in local status', () => {
        it('sees no local changes', () => {
          const result = execCmd<StatusResult[]>(replaceRenamedCommands('force:source:status --json --local'), {
            ensureExitCode: 0,
          }).jsonOutput.result;
          expect(result, JSON.stringify(result)).to.be.an.instanceof(Array).with.length(2);
        });
      });
    });
  });
});
