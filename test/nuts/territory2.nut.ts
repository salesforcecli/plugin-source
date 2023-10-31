/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import fs from 'node:fs';
import path from 'node:path';
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { expect } from 'chai';
import { DeployCommandResult } from '../../src/formatters/deployResultFormatter.js';
import { RetrieveCommandResult } from '../../src/formatters/retrieveResultFormatter.js';

describe('territories', () => {
  let session: TestSession;
  let projectPath: string;
  let modelPath: string;

  before(async () => {
    session = await TestSession.create({
      project: {
        // special thanks to Scott Wells for this sample project
        sourceDir: path.join(process.cwd(), 'test', 'nuts', 'territoryProject'),
      },
      devhubAuthStrategy: 'AUTO',
      scratchOrgs: [
        {
          setDefault: true,
          config: path.join('config', 'project-scratch-def.json'),
        },
      ],
    });
    projectPath = path.join(session.project.dir, 'force-app', 'main', 'default');
    modelPath = path.join(projectPath, 'territory2Models', 'SCW_Territory_Model');
  });

  after(async () => {
    await session?.clean();
  });

  describe('manifest', () => {
    after(async () => {
      await fs.promises.unlink(path.join(session.project.dir, 'package.xml'));
    });

    it('can generate manifest for territory types', () => {
      execCmd('force:source:manifest:create -p force-app --json', {
        ensureExitCode: 0,
      });
      expect(fs.existsSync(path.join(session.project.dir, 'package.xml'))).to.be.true;
    });

    it('deploy', () => {
      const deployResults = execCmd<DeployCommandResult>('force:source:deploy -x package.xml --json', {
        ensureExitCode: 0,
      }).jsonOutput.result;
      expect(deployResults.deployedSource.length).to.equal(8);
    });

    it('retrieve without local metadata', async () => {
      // delete and recreate an empty dir
      await fs.promises.rm(path.join(session.project.dir, 'force-app'), { recursive: true });
      await fs.promises.mkdir(path.join(session.project.dir, 'force-app'));
      const retrieveResults = execCmd<RetrieveCommandResult>('force:source:retrieve -x package.xml --json', {
        ensureExitCode: 0,
      }).jsonOutput.result;
      expect(retrieveResults.inboundFiles).to.have.length(8);
    });
  });

  describe('metadata', () => {
    describe('deploy', () => {
      it('can deploy all metadata items', () => {
        execCmd('force:source:deploy -m Territory2,Territory2Model,Territory2Rule,Territory2Type --json', {
          ensureExitCode: 0,
        });
      });

      describe('individual type deploys', () => {
        it('can deploy Territory2Model', () => {
          execCmd('force:source:deploy -m Territory2Model --json', {
            ensureExitCode: 0,
          });
        });

        it('can deploy Territory2Rule', () => {
          execCmd('force:source:deploy -m Territory2Rule --json', {
            ensureExitCode: 0,
          });
        });

        it('can deploy Territory2Type', () => {
          execCmd('force:source:deploy -m Territory2Type --json', {
            ensureExitCode: 0,
          });
        });

        it('can deploy Territory2', () => {
          execCmd('force:source:deploy -m Territory2 --json', {
            ensureExitCode: 0,
          });
        });
      });

      describe('individual metadata item deploys', () => {
        it('can deploy Territory2Model', () => {
          execCmd('force:source:deploy -m Territory2Model:SCW_Territory_Model --json', {
            ensureExitCode: 0,
          });
        });

        it('can deploy Territory2Rule', () => {
          execCmd('force:source:deploy -m Territory2Rule:SCW_Territory_Model.Fishing_Stores --json', {
            ensureExitCode: 0,
          });
        });

        it('can deploy Territory2', () => {
          execCmd('force:source:deploy -m Territory2:SCW_Territory_Model.Austin  --json', {
            ensureExitCode: 0,
          });
        });
      });
    });

    describe('retrieve', () => {
      it('can retrieve all metadata items', () => {
        execCmd('force:source:retrieve -m Territory2,Territory2Model,Territory2Rule,Territory2Type --json', {
          ensureExitCode: 0,
        });
      });

      describe('individual type retrieves', () => {
        it('can retrieve Territory2Model', () => {
          execCmd('force:source:retrieve -m Territory2Model --json', {
            ensureExitCode: 0,
          });
        });

        it('can retrieve Territory2Rule', () => {
          execCmd('force:source:retrieve -m Territory2Rule --json', {
            ensureExitCode: 0,
          });
        });

        it('can retrieve Territory2Type', () => {
          execCmd('force:source:retrieve -m Territory2Type --json', {
            ensureExitCode: 0,
          });
        });

        it('can retrieve Territory2', () => {
          execCmd('force:source:retrieve -m Territory2 --json', {
            ensureExitCode: 0,
          });
        });
      });

      describe('individual metadata item deploys', () => {
        it('can deploy Territory2Model', () => {
          execCmd('force:source:deploy -m Territory2Model:SCW_Territory_Model --json', {
            ensureExitCode: 0,
          });
        });

        it('can deploy Territory2Rule', () => {
          execCmd('force:source:deploy -m Territory2Rule:SCW_Territory_Model.Fishing_Stores --json', {
            ensureExitCode: 0,
          });
        });

        it('can deploy Territory2', () => {
          execCmd('force:source:deploy -m Territory2:SCW_Territory_Model.Austin  --json', {
            ensureExitCode: 0,
          });
        });
      });
    });
  });

  describe('sourcepath', () => {
    describe('deploy', () => {
      it('can deploy the whole project', () => {
        execCmd('force:source:deploy -p force-app --json', {
          ensureExitCode: 0,
        });
      });

      describe('individual type deploys', () => {
        it('can deploy Territory2Rule', () => {
          execCmd(`force:source:deploy -p ${path.join(modelPath, 'rules')} --json`, {
            ensureExitCode: 0,
          });
        });

        it('can deploy Territory2Type', () => {
          execCmd(`force:source:deploy -p ${path.join(projectPath, 'territory2Types')} --json`, {
            ensureExitCode: 0,
          });
        });

        it('can deploy Territory2', () => {
          execCmd(`force:source:deploy -p ${path.join(modelPath, 'territories')} --json`, {
            ensureExitCode: 0,
          });
        });
      });

      describe('individual metadata item deploys', () => {
        it('can deploy Territory2Model', () => {
          execCmd('force:source:deploy -m Territory2Model:SCW_Territory_Model --json', {
            ensureExitCode: 0,
          });
        });

        it('can deploy Territory2Rule', () => {
          execCmd(
            `force:source:deploy -p ${path.join(modelPath, 'rules', 'Fishing_Stores.territory2Rule-meta.xml')} --json`,
            {
              ensureExitCode: 0,
            }
          );
        });

        it('can deploy Territory2', () => {
          execCmd(
            `force:source:deploy -p ${path.join(modelPath, 'territories', 'Austin.territory2-meta.xml')} --json`,
            {
              ensureExitCode: 0,
            }
          );
        });
      });
    });

    describe('retrieve', () => {
      it('can retrieve the whole project', () => {
        execCmd('force:source:retrieve -p force-app --json', {
          ensureExitCode: 0,
        });
      });

      describe('individual type retrieves', () => {
        it('can retrieve Territory2Rule', () => {
          execCmd(`force:source:retrieve -p ${path.join(modelPath, 'rules')} --json`, {
            ensureExitCode: 0,
          });
        });

        it('can retrieve Territory2Type', () => {
          execCmd(`force:source:retrieve -p ${path.join(projectPath, 'territory2Types')} --json`, {
            ensureExitCode: 0,
          });
        });

        it('can retrieve Territory2', () => {
          execCmd(`force:source:retrieve -p ${path.join(modelPath, 'territories')} --json`, {
            ensureExitCode: 0,
          });
        });
      });

      describe('individual metadata item retrieves', () => {
        it('can retrieve Territory2Model', () => {
          execCmd('force:source:retrieve -m Territory2Model:SCW_Territory_Model --json', {
            ensureExitCode: 0,
          });
        });

        it('can retrieve Territory2Rule', () => {
          execCmd(
            `force:source:retrieve -p ${path.join(
              modelPath,
              'rules',
              'Fishing_Stores.territory2Rule-meta.xml'
            )} --json`,
            {
              ensureExitCode: 0,
            }
          );
        });

        it('can retrieve Territory2', () => {
          execCmd(
            `force:source:retrieve -p ${path.join(modelPath, 'territories', 'Austin.territory2-meta.xml')} --json`,
            {
              ensureExitCode: 0,
            }
          );
        });
      });
    });
  });
});
