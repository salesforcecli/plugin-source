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
import { PushResponse } from 'src/formatters/source/pushResultFormatter';
import { DeployCommandResult } from '../../src/formatters/deployResultFormatter';
import { RetrieveCommandResult } from '../../src/formatters/retrieveResultFormatter';
import { StatusResult } from '../../src/formatters/source/statusFormatter';

describe('translations', () => {
  let session: TestSession;
  let projectPath: string;
  let translationPath: string;

  before(async () => {
    session = await TestSession.create({
      project: {
        sourceDir: path.join(process.cwd(), 'test', 'nuts', 'customTranslationProject'),
      },
      devhubAuthStrategy: 'AUTO',
      scratchOrgs: [
        {
          executable: 'sfdx',
          duration: 1,
          setDefault: true,
          wait: 10,
          config: path.join('config', 'project-scratch-def.json'),
        },
      ],
    });
    projectPath = path.join(session.project.dir, 'force-app', 'main', 'default');
    translationPath = path.join(projectPath, 'objectTranslations', 'customObject__c-es');
  });

  after(async () => {
    await session?.clean();
  });
  describe('tracking/push', () => {
    it('can deploy the whole project', async () => {
      execCmd('force:source:push --json', {
        ensureExitCode: 0,
      });
    });

    it('modify and see local change', async () => {
      const fieldFile = path.join(translationPath, 'customField__c.fieldTranslation-meta.xml');
      const original = await fs.promises.readFile(fieldFile, 'utf8');
      await fs.promises.writeFile(fieldFile, original.replace('spanish', 'español'));
      const statusResult = execCmd<StatusResult[]>('force:source:status --json', {
        ensureExitCode: 0,
      }).jsonOutput.result;

      expect(statusResult[0].type).to.equal('CustomObjectTranslation');
    });

    it('push local change', async () => {
      const pushResult = execCmd<PushResponse>('force:source:push --json', {
        ensureExitCode: 0,
      }).jsonOutput.result;
      expect(pushResult.pushedSource.every((s) => s.type === 'CustomObjectTranslation')).to.be.true;
    });

    it('sees no local changes', () => {
      const statusResult = execCmd<StatusResult[]>('force:source:status --json', {
        ensureExitCode: 0,
      }).jsonOutput.result;
      expect(statusResult).to.deep.equal([]);
    });
  });

  describe('manifest', () => {
    after(async () => {
      await fs.promises.unlink(path.join(session.project.dir, 'package.xml'));
    });

    it('can generate manifest for translation types', async () => {
      execCmd('force:source:manifest:create -p force-app --json', {
        ensureExitCode: 0,
      });
      expect(fs.existsSync(path.join(session.project.dir, 'package.xml'))).to.be.true;
    });

    it('deploy', () => {
      const deployResults = execCmd<DeployCommandResult>('force:source:deploy -x package.xml --json', {
        ensureExitCode: 0,
      }).jsonOutput.result;
      expect(deployResults.deployedSource.length).to.equal(7);
    });

    it('retrieve without local metadata', async () => {
      // delete and recreate an empty dir
      await fs.promises.rm(path.join(session.project.dir, 'force-app'), { recursive: true });
      await fs.promises.mkdir(path.join(session.project.dir, 'force-app'));
      const retrieveResults = execCmd<RetrieveCommandResult>('force:source:retrieve -x package.xml --json', {
        ensureExitCode: 0,
      }).jsonOutput.result;
      expect(retrieveResults.inboundFiles).to.have.length(7);
    });
  });

  describe('metadata', () => {
    describe('deploy', () => {
      it('can deploy all metadata items', async () => {
        execCmd('force:source:deploy -m CustomFieldTranslation,CustomObjectTranslation --json', {
          ensureExitCode: 0,
        });
      });
    });

    describe('retrieve', () => {
      it('can retrieve all metadata items', async () => {
        execCmd('force:source:retrieve -m CustomFieldTranslation,CustomObjectTranslation --json', {
          ensureExitCode: 0,
        });
      });
    });
  });

  describe('sourcepath', () => {
    describe('deploy', () => {
      it('can deploy the whole project', async () => {
        execCmd('force:source:deploy -p force-app --json', {
          ensureExitCode: 0,
        });
      });

      describe('individual type deploys', () => {
        it('can deploy COT', async () => {
          execCmd(`force:source:deploy -p ${translationPath} --json`, {
            ensureExitCode: 0,
          });
        });

        it('can deploy CFTs', async () => {
          const result = execCmd<DeployCommandResult>(
            `force:source:deploy -p ${path.join(translationPath, 'customField__c.fieldTranslation-meta.xml')} --json`,
            {
              ensureExitCode: 0,
            }
          );
          expect(result.jsonOutput.result.deployedSource.some((d) => d.type === 'CustomObjectTranslation')).to.be.true;
        });

        it('can deploy COT', async () => {
          execCmd(
            `force:source:deploy -p ${path.join(translationPath, 'customField__c.fieldTranslation-meta.xml')} --json`,
            {
              ensureExitCode: 0,
            }
          );
        });
      });
    });

    describe('retrieve', () => {
      it('can retrieve the whole project', async () => {
        execCmd('force:source:retrieve -p force-app --json', {
          ensureExitCode: 0,
        });
      });

      describe('individual type retrieves', () => {
        it('can retrieve COT', async () => {
          execCmd(`force:source:retrieve -p ${translationPath} --json`, {
            ensureExitCode: 0,
          });
        });

        it('can retrieve COT from directory', async () => {
          execCmd(
            `force:source:retrieve -p ${path.join(
              translationPath,
              'customObject__c-es.objectTranslation-meta.xml'
            )} --json`,
            {
              ensureExitCode: 0,
            }
          );
        });
      });
    });
  });

  describe('mdapi format', () => {
    it('can convert COT/CFTs correctly', () => {
      execCmd('force:source:convert --outputdir mdapi', { ensureExitCode: 0 });
      // the CFTs shouldn't be written to mdapi format
      expect(fs.existsSync(path.join(session.project.dir, 'mdapi', 'fields'))).to.be.false;
      expect(fs.existsSync(path.join(session.project.dir, 'mdapi', 'objectTranslations'))).to.be.true;
    });
  });
});
