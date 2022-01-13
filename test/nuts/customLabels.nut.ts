/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as fs from 'fs';
import * as path from 'path';
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { expect } from 'chai';
import { parse as parseXml } from 'fast-xml-parser';
import { RetrieveCommandResult } from '../../src/formatters/retrieveResultFormatter';
import { StatusResult } from '../../src/formatters/statusFormatter';

describe('Custom Labels', () => {
  let session: TestSession;
  let labelPath1: string;
  let labelPath2: string;
  let label1GoldFile: Record<string, unknown>;
  let label2GoldFile: Record<string, unknown>;
  before(async () => {
    session = await TestSession.create({
      project: {
        gitClone: 'https://github.com/salesforcecli/sample-project-multiple-packages',
      },
      setupCommands: [
        'sfdx force:org:create -f config/project-scratch-def.json --setdefaultusername --wait 10 --durationdays 1',
      ],
    });
    labelPath1 = path.join(
      session.project.dir,
      'force-app',
      'main',
      'default',
      'labels',
      'CustomLabels.labels-meta.xml'
    );
    labelPath2 = path.join(session.project.dir, 'my-app', 'labels', 'CustomLabels.labels-meta.xml');
    [label1GoldFile, label2GoldFile] = (
      await Promise.all([fs.promises.readFile(labelPath1, 'utf-8'), fs.promises.readFile(labelPath2, 'utf-8')])
    ).map((file) => parseXml(file) as Record<string, unknown>);
  });

  after(async () => {
    await session?.clean();
  });

  const filesStillMatch = async () => {
    const [result1, result2] = await Promise.all([
      fs.promises.readFile(labelPath1, 'utf-8'),
      fs.promises.readFile(labelPath2, 'utf-8'),
    ]);
    expect(parseXml(result1)).to.deep.equal(label1GoldFile);
    expect(parseXml(result2)).to.deep.equal(label2GoldFile);
  };

  describe('push', () => {
    it('sees correct label status', () => {
      const result = execCmd<StatusResult[]>('force:source:beta:status --local --json', { ensureExitCode: 0 })
        .jsonOutput.result;
      expect(result.length).to.be.greaterThan(15);
    });
    it('pushes the initial project successfully', () => {
      execCmd('force:source:beta:push', { ensureExitCode: 0 });
    });
    it('sees correct label status after push', () => {
      const result = execCmd<StatusResult[]>('force:source:beta:status --local --json', { ensureExitCode: 0 })
        .jsonOutput.result;
      expect(result.length).to.equal(0);
    });
  });

  describe('e2e for on decomposition retrieves', () => {
    it('can retrieve and properly merge files from path to 2 labels file', async () => {
      execCmd<RetrieveCommandResult>('force:source:retrieve -p force-app,my-app --json', {
        ensureExitCode: 0,
      }).jsonOutput.result;
      await filesStillMatch();
    });
    it('can retrieve and properly merge files from customLabels type (all labels)', async () => {
      execCmd<RetrieveCommandResult>('force:source:retrieve -m CustomLabels --json', {
        ensureExitCode: 0,
      }).jsonOutput.result;
      await filesStillMatch();
    });

    it('can retrieve and properly merge a single label in an existing file (no change)', async () => {
      execCmd<RetrieveCommandResult>('force:source:retrieve -m CustomLabel:force_app_Label_1 --json', {
        ensureExitCode: 0,
      }).jsonOutput.result;
      await filesStillMatch();
    });

    it('can retrieve and properly merge a single label in a non-default dir (no change)', async () => {
      execCmd<RetrieveCommandResult>('force:source:retrieve -m CustomLabel:my_app_Label_1 --json', {
        ensureExitCode: 0,
      }).jsonOutput.result;
      await filesStillMatch();
    });

    it('can retrieve and properly merge 2 single label in 2 different dirs (no change)', async () => {
      execCmd<RetrieveCommandResult>(
        'force:source:retrieve -m CustomLabel:my_app_Label_1,CustomLabel:force_app_Label_1 --json',
        {
          ensureExitCode: 0,
        }
      ).jsonOutput.result;
      await filesStillMatch();
    });

    it("can retrieve and create the default file for 2 labels we don't have locally", async () => {
      await fs.promises.rm(labelPath1);
      execCmd<RetrieveCommandResult>(
        'force:source:retrieve -m CustomLabel:force_app_Label_1,CustomLabel:force_app_Label_2  --json',
        {
          ensureExitCode: 0,
        }
      ).jsonOutput.result;
      await filesStillMatch();
    });

    it('if you remove label2 and retrieve it, both labels will be present', async () => {
      // remove label2 and then retrieve it.  Make sure label
      await fs.promises.writeFile(
        labelPath1,
        (
          await fs.promises.readFile(labelPath1, 'utf-8')
        ).replace(/(<labels>\s*<fullName>force_app_Label_2.*<\/labels>)/gs, '')
      );
      execCmd<RetrieveCommandResult>('force:source:retrieve -m CustomLabel:force_app_Label_2 --json', {
        ensureExitCode: 0,
      }).jsonOutput.result;
      await filesStillMatch();
    });
  });
});
