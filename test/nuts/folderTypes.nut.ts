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
import { DeployCommandResult } from '../../src/formatters/deployResultFormatter';
import { RetrieveCommandResult } from '../../src/formatters/retrieveResultFormatter';
import { FileResponse } from '@salesforce/source-deploy-retrieve';

describe('metadata types that go in folders', () => {
  let session: TestSession;

  before(async () => {
    session = await TestSession.create({
      project: {
        gitClone: 'https://github.com/mshanemc/nestedFolders',
      },
      setupCommands: [
        'sfdx force:org:create -f config/project-scratch-def.json --setdefaultusername --wait 10 --durationdays 1',
      ],
    });
  });

  after(async () => {
    await session?.clean();
  });

  describe('emailTemplates', () => {
    after(async () => {
      await fs.promises.unlink(path.join(session.project.dir, 'package.xml'));
    });

    const getExpectedSource = (state: 'Created' | 'Changed') => ([
      {
        fullName: 'Top_Level_Folder',
        type: 'EmailFolder',
        state,
        filePath: path.join('default', 'email', 'Top_Level_Folder.emailFolder-meta.xml'),
      }, {
        fullName: 'Top_Level_Folder/Template_in_folder',
        type: 'EmailTemplate',
        state,
        filePath: path.join('email', 'Top_Level_Folder', 'Template_in_folder.email'),
      }, {
        fullName: 'Top_Level_Folder/Template_in_folder',
        type: 'EmailTemplate',
        state,
        filePath: path.join('email', 'Top_Level_Folder', 'Template_in_folder.email-meta.xml'),
      }, {
        fullName: 'unfiled$public/Top_level_email',
        type: 'EmailTemplate',
        state,
        filePath: path.join('email', 'unfiled$public', 'Top_level_email.email'),
      }, {
        fullName: 'unfiled$public/Top_level_email',
        type: 'EmailTemplate',
        state,
        filePath: path.join('email', 'unfiled$public', 'Top_level_email.email-meta.xml'),
      }
    ]);

    const getRelativeFileResponses = (resp: FileResponse[]) => {
      return resp.map(s => {
        let { fullName, type, state, filePath } = s;
        // grab the last 2 directories with the file only
        filePath = s.filePath.split(path.sep).slice(-3).join(path.sep);
        return { fullName, type, state, filePath };
      });
    }

    it('can generate manifest for just the emailTemplates', () => {
      const pathToEmails = path.join('force-app', 'main', 'default', 'email');
      execCmd(`force:source:manifest:create -p ${pathToEmails} --json`, { ensureExitCode: 0 });
      expect(fs.existsSync(path.join(session.project.dir, 'package.xml'))).to.be.true;
    });

    it('can deploy email templates via the manifest', () => {
      const deployResults = execCmd<DeployCommandResult>('force:source:deploy -x package.xml --json').jsonOutput;
      expect(deployResults.status, JSON.stringify(deployResults)).to.equal(0); 
      const deployedSource = getRelativeFileResponses(deployResults.result.deployedSource);
      expect(deployedSource).to.have.deep.members(getExpectedSource('Created'));
    });

    it('can retrieve email templates via the manifest', () => {
      const retrieveResults = execCmd<RetrieveCommandResult>('force:source:retrieve -x package.xml --json').jsonOutput;
      expect(retrieveResults.status, JSON.stringify(retrieveResults)).to.equal(0);
      const retrievedSource = getRelativeFileResponses(retrieveResults.result.inboundFiles);
      expect(retrievedSource).to.have.deep.members(getExpectedSource('Changed'));
    });
  });

  describe('reports', () => {
    after(async () => {
      await fs.promises.unlink(path.join(session.project.dir, 'package.xml'));
    });

    it('can generate manifest for just the reports', () => {
      expect(fs.existsSync(path.join(session.project.dir, 'package.xml'))).to.be.false;
      const pathToReports = path.join('force-app', 'main', 'default', 'reports');
      execCmd(`force:source:manifest:create -p ${pathToReports} --json`, { ensureExitCode: 0 });
      expect(fs.existsSync(path.join(session.project.dir, 'package.xml'))).to.be.true;
    });

    it('can deploy reports via the manifest', () => {
      execCmd('force:source:deploy -x package.xml --json', { ensureExitCode: 0 });
    });

    it('can retrieve reports via the manifest', () => {
      execCmd('force:source:retrieve -x package.xml --json', { ensureExitCode: 0 });
    });
  });
});
