/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'shelljs';
import { expect } from 'chai';
import { execCmd, ExecCmdResult, TestSession } from '@salesforce/cli-plugins-testkit';
import { RequestStatus } from '@salesforce/source-deploy-retrieve';
import { create as createArchive } from 'archiver';
import { RetrieveCommandAsyncResult, RetrieveCommandResult } from 'src/formatters/mdapi/retrieveResultFormatter';
import { DeployCancelCommandResult } from '../../src/formatters/deployCancelResultFormatter';
import { MdDeployResult } from '../../src/formatters/mdapi/mdDeployResultFormatter';

let session: TestSession;
// must be skipped while source:convert is moved to PDR
describe.skip('1k files in mdapi:deploy', () => {
  const classCount = 1000;

  before(async () => {
    session = await TestSession.create({
      project: {
        name: 'large-repo',
      },
      devhubAuthStrategy: 'AUTO',
      scratchOrgs: [
        {
          executable: 'sfdx',
          config: path.join('config', 'project-scratch-def.json'),
          setDefault: true,
          duration: 1,
        },
      ],
    });
    // create some number of files
    const classdir = path.join(session.project.dir, 'force-app', 'main', 'default', 'classes');

    for (let c = 0; c < classCount; c++) {
      const className = `xx${c}`;
      // intentionally batched to avoid fs limits on windows
      // eslint-disable-next-line no-await-in-loop
      await Promise.all([
        fs.promises.writeFile(
          path.join(classdir, `${className}.cls`),
          `public with sharing class ${className} {public ${className}() {}}`
        ),
        fs.promises.writeFile(
          path.join(classdir, `${className}.cls-meta.xml`),
          '<?xml version="1.0" encoding="UTF-8"?><ApexClass xmlns="http://soap.sforce.com/2006/04/metadata"><apiVersion>54.0</apiVersion><status>Active</status></ApexClass>'
        ),
      ]);
    }
  });

  after(async () => {
    await session?.clean();
  });

  it('should be able to handle a mdapi:deploy of 1k', async () => {
    execCmd('force:source:convert --outputdir mdapiFormat', { ensureExitCode: 0 });
    const res = execCmd<{ checkOnly: boolean; done: boolean }>('force:mdapi:deploy -d mdapiFormat -w 100 --json', {
      ensureExitCode: 0,
    }).jsonOutput;
    expect(res.status).to.equal(0);
    // check that the deploy actually happened, not just based on the exit code, otherwise something like
    // https://github.com/forcedotcom/cli/issues/1531 could happen
    expect(res.result.checkOnly).to.be.false;
    expect(res.result.done).to.be.true;
  });
});
// must be skipped while source:convert is moved to PDR
describe.skip('mdapi NUTs', () => {
  before(async () => {
    session = await TestSession.create({
      project: {
        gitClone: 'https://github.com/trailheadapps/dreamhouse-lwc.git',
      },
      devhubAuthStrategy: 'AUTO',
      scratchOrgs: [
        {
          executable: 'sfdx',
          config: path.join('config', 'project-scratch-def.json'),
          setDefault: true,
          duration: 1,
        },
        {
          executable: 'sfdx',
          config: path.join('config', 'project-scratch-def.json'),
          duration: 1,
          alias: 'nonDefaultOrg',
        },
      ],
    });

    execCmd('force:source:deploy -p force-app', { cli: 'sfdx' });
    execCmd('force:user:permset:assign -n dreamhouse', { cli: 'sfdx' });

    process.env.SFDX_USE_PROGRESS_BAR = 'false';
  });

  after(async () => {
    await session?.zip(undefined, 'artifacts');
    await session?.clean();
  });

  describe('mdapi:deploy:cancel', () => {
    const cancelAssertions = (deployId: string, result: ExecCmdResult<DeployCancelCommandResult>): void => {
      if (result.jsonOutput.status === 0) {
        // a successful cancel
        const json = result.jsonOutput.result;
        expect(json).to.have.property('canceledBy');
        expect(json).to.have.property('status');
        expect(json.status).to.equal(RequestStatus.Canceled);
        expect(json.id).to.equal(deployId);
      } else if (result.jsonOutput.status === 1 && result.jsonOutput.result) {
        // status = 1 because the deploy is in Succeeded status
        const json = result.jsonOutput.result;
        expect(json.status).to.equal(RequestStatus.Succeeded);
      } else {
        // the other allowable error is that the server is telling us the deploy succeeded
        expect(result.jsonOutput.name, JSON.stringify(result)).to.equal('CancelFailed');
        expect(result.jsonOutput.message, JSON.stringify(result)).to.equal(
          'The cancel command failed due to: INVALID_ID_FIELD: Deployment already completed'
        );
      }
    };

    it('will cancel an mdapi deploy via the stash.json', () => {
      const convertDir = 'mdConvert1';
      execCmd(`force:source:convert --outputdir ${convertDir}`, { ensureExitCode: 0 });
      const deploy = execCmd<{ id: string }>(`force:mdapi:deploy -d ${convertDir} -w 0 --json`, {
        ensureExitCode: 0,
      }).jsonOutput;
      const result = execCmd<DeployCancelCommandResult>('force:mdapi:deploy:cancel --json');
      cancelAssertions(deploy.result.id, result);
    });

    it('will cancel an mdapi deploy via the specified deploy id', () => {
      const convertDir = 'mdConvert2';
      execCmd(`force:source:convert --outputdir ${convertDir}`, { ensureExitCode: 0 });
      const deploy = execCmd<{ id: string }>(`force:mdapi:deploy -d ${convertDir} -w 0 --json`, {
        ensureExitCode: 0,
      }).jsonOutput;
      const result = execCmd<DeployCancelCommandResult>('force:mdapi:deploy:cancel --json');
      cancelAssertions(deploy.result.id, result);
    });
  });

  describe('MDAPI Retrieve Tests', () => {
    const manifestPath = 'dreamhouseContent.xml';
    const apexManifestPath = 'dreamhouseApex.xml';
    const ELECTRON = { id: '04t6A000002zgKSQAY', name: 'ElectronBranding' };

    before(() => {
      // Install the ElectronBranding package in the default org for retrieve commands to use
      const pkgInstallCmd = `sfdx force:package:install --noprompt --package ${ELECTRON.id} --wait 5 --json`;
      let rv = exec(pkgInstallCmd, { silent: true });
      expect(rv.code, 'Failed to install ElectronBranding package for tests').to.equal(0);

      // Create manifests for retrieve commands to use
      rv = exec(`sfdx force:source:manifest:create -p force-app -n ${manifestPath}`, { silent: true });
      expect(rv.code, `Failed to create ${manifestPath} manifest for tests`).to.equal(0);
      rv = exec(`sfdx force:source:manifest:create -m ApexClass -n ${apexManifestPath}`, { silent: true });
      expect(rv.code, `Failed to create ${apexManifestPath} manifest for tests`).to.equal(0);
    });

    describe('mdapi:retrieve (sync)', () => {
      it('retrieves content from manifest', () => {
        const retrieveTargetDir = 'mdRetrieveFromManifest';
        const retrieveTargetDirPath = path.join(session.project.dir, retrieveTargetDir);
        const cmd = `force:mdapi:retrieve -w 10 -r ${retrieveTargetDir} -k ${manifestPath} --json`;
        const rv = execCmd<RetrieveCommandResult>(cmd, { ensureExitCode: 0 });

        // Verify unpackaged.zip exists in retrieveTargetDir
        const retrievedZip = fs.existsSync(retrieveTargetDirPath);
        expect(retrievedZip, 'retrieved zip was not in expected path').to.be.true;
        const result = rv.jsonOutput.result;
        expect(result.status).to.equal(RequestStatus.Succeeded);
        expect(result.success).to.be.true;
        expect(result.fileProperties).to.be.an('array').with.length.greaterThan(50);
        const zipFileLocation = path.join(retrieveTargetDirPath, 'unpackaged.zip');
        expect(result.zipFilePath).to.equal(zipFileLocation);
      });

      it('retrieves content from manifest using manifest api version', async () => {
        // modify the manifest to use a different api version
        const targetApiVersion = '54.0';
        const manifestRelativePath = path.join(session.project.dir, manifestPath);

        const original = await fs.promises.readFile(manifestRelativePath, 'utf8');
        await fs.promises.writeFile(
          manifestRelativePath,
          original.replace(/<version>.*<\/version>/g, `<version>${targetApiVersion}</version>`)
        );
        const retrieveTargetDir = 'mdRetrieveFromManifest';
        const cmd = `force:mdapi:retrieve -w 10 -r ${retrieveTargetDir} -k ${manifestPath}`;
        const rv = execCmd<RetrieveCommandResult>(cmd, { ensureExitCode: 0 }).shellOutput;
        expect(rv.stdout).to.include(`Retrieving v${targetApiVersion} metadata from`);
      });

      it('retrieves single package', () => {
        const retrieveTargetDir = 'mdRetrieveSinglePackage';
        const retrieveTargetDirPath = path.join(session.project.dir, retrieveTargetDir);
        const cmd = `force:mdapi:retrieve -w 10 -r ${retrieveTargetDir} -p ${ELECTRON.name} --json`;
        const rv = execCmd<RetrieveCommandResult>(cmd, { ensureExitCode: 0 });

        // Verify unpackaged.zip exists in retrieveTargetDir
        const retrievedZip = fs.existsSync(retrieveTargetDirPath);
        expect(retrievedZip, 'retrieved zip was not in expected path').to.be.true;
        const result = rv.jsonOutput.result;
        expect(result.status).to.equal(RequestStatus.Succeeded);
        expect(result.success).to.be.true;
        expect(result.fileProperties).to.be.an('array').with.length.greaterThan(5);
        const zipFileLocation = path.join(retrieveTargetDirPath, 'unpackaged.zip');
        expect(result.zipFilePath).to.equal(zipFileLocation);
      });

      it('retrieves content with named zip and unzips', () => {
        const name = 'apexClasses';
        const zipName = `${name}.zip`;
        const retrieveTargetDir = 'mdRetrieveNamedZipAndUnzip';
        const retrieveTargetDirPath = path.join(session.project.dir, retrieveTargetDir);
        const cmd = `force:mdapi:retrieve -w 10 -r ${retrieveTargetDir} -k ${apexManifestPath} -z -n ${zipName} --json`;
        const rv = execCmd<RetrieveCommandResult>(cmd, { ensureExitCode: 0 });

        // Verify apexClasses.zip exists in retrieveTargetDir
        const retrievedZip = fs.existsSync(path.join(retrieveTargetDirPath, zipName));
        expect(retrievedZip, 'retrieved zip was not in expected path').to.be.true;
        const extractPath = path.join(retrieveTargetDirPath, name);
        const unzipDir = fs.existsSync(extractPath);
        expect(unzipDir, 'retrieved zip was not extracted to expected path').to.be.true;
        expect(fs.readdirSync(extractPath)).to.deep.equal(['unpackaged']);
        expect(rv.jsonOutput, JSON.stringify(rv)).to.exist;
        const result = rv.jsonOutput.result;
        expect(result.status).to.equal(RequestStatus.Succeeded);
        expect(result.success).to.be.true;
        expect(result.fileProperties).to.be.an('array').with.length.greaterThan(5);
        const zipFileLocation = path.join(retrieveTargetDirPath, zipName);
        expect(result.zipFilePath).to.equal(zipFileLocation);
      });
    });

    describe('mdapi:retrieve (async) and mdapi:retrieve:report', () => {
      it('retrieves report (async)', () => {
        const retrieveTargetDir = 'mdRetrieveReportAsync';
        const retrieveTargetDirPath = path.join(session.project.dir, retrieveTargetDir);
        const retrieveCmd = `force:mdapi:retrieve -r ${retrieveTargetDir} -k ${manifestPath} --json -w 0`;
        const rv1 = execCmd<RetrieveCommandAsyncResult>(retrieveCmd, { ensureExitCode: 0 });
        expect(rv1.jsonOutput, JSON.stringify(rv1)).to.exist;

        const result1 = rv1.jsonOutput.result;
        expect(result1).to.have.property('done', false);
        expect(result1).to.have.property('id');
        expect(result1).to.have.property('state', 'Queued');
        expect(result1).to.have.property('status', 'Queued');
        expect(result1).to.have.property('timedOut', true);

        // Async report, from stash
        let reportCmd = 'force:mdapi:retrieve:report -w 0 --json';
        const rv2 = execCmd<RetrieveCommandAsyncResult>(reportCmd, { ensureExitCode: 0 });
        const result2 = rv2.jsonOutput.result;

        let syncResult: RetrieveCommandResult;

        // It's possible that the async retrieve request is already done, so account for that
        // and treat it like a sync result.
        if (result2.done) {
          syncResult = result2 as unknown as RetrieveCommandResult;
        } else {
          expect(result2).to.have.property('id', result1.id);
          // To prevent flapping we expect 1 of 3 likely states.  All depends
          // on how responsive the message queue is.
          expect(result2.state).to.be.oneOf(['Queued', 'Pending', 'InProgress']);
          expect(result2.status).to.be.oneOf(['Queued', 'Pending', 'InProgress']);
          expect(result2).to.have.property('timedOut', true);

          // Now sync report, from stash
          reportCmd = 'force:mdapi:retrieve:report -w 10 --json';
          const rv3 = execCmd<RetrieveCommandResult>(reportCmd, { ensureExitCode: 0 });
          syncResult = rv3.jsonOutput.result;
        }
        expect(syncResult.status).to.equal(RequestStatus.Succeeded);
        expect(syncResult.success).to.be.true;
        expect(syncResult.fileProperties).to.be.an('array').with.length.greaterThan(50);
        const zipFileLocation = path.join(retrieveTargetDirPath, 'unpackaged.zip');
        expect(syncResult.zipFilePath).to.equal(zipFileLocation);
      });

      it('retrieves report (sync) with overrides of stash', () => {
        const retrieveCmd = `force:mdapi:retrieve -r mdRetrieveReportTmp -k ${manifestPath} --json -w 0`;
        const rv1 = execCmd<RetrieveCommandAsyncResult>(retrieveCmd, { ensureExitCode: 0 });
        expect(rv1.jsonOutput, JSON.stringify(rv1)).to.exist;

        const result1 = rv1.jsonOutput.result;

        const name = 'dreamhouse';
        const zipName = `${name}.zip`;
        const retrieveTargetDir = 'mdRetrieveReportOverrides';
        const retrieveTargetDirPath = path.join(session.project.dir, retrieveTargetDir);
        const extractPath = path.join(retrieveTargetDirPath, name);

        const reportCmd = `force:mdapi:retrieve:report -i ${result1.id} -z -n ${zipName} -r ${retrieveTargetDir} --json`;
        const rv2 = execCmd<RetrieveCommandResult>(reportCmd, { ensureExitCode: 0 });
        expect(rv2.jsonOutput, JSON.stringify(rv2)).to.exist;

        const result2 = rv2.jsonOutput.result;
        expect(result2.status).to.equal(RequestStatus.Succeeded);
        expect(result2.success).to.be.true;
        expect(result2.id).to.equal(result1.id);
        expect(result2.fileProperties).to.be.an('array').with.length.greaterThan(5);
        const zipFileLocation = path.join(retrieveTargetDirPath, zipName);
        expect(result2.zipFilePath).to.equal(zipFileLocation);
        const retrievedZip = fs.existsSync(path.join(retrieveTargetDirPath, zipName));
        expect(retrievedZip, 'retrieved zip was not in expected path').to.be.true;
        const unzipDir = fs.existsSync(extractPath);
        expect(unzipDir, 'retrieved zip was not extracted to expected path').to.be.true;
        expect(fs.readdirSync(extractPath)).to.deep.equal(['unpackaged']);
      });

      it('retrieves report (sync) with all stashed params', () => {
        const name = 'dreamhouse';
        const zipName = `${name}.zip`;
        const retrieveTargetDir = 'mdRetrieveReportStash';
        const retrieveTargetDirPath = path.join(session.project.dir, retrieveTargetDir);
        const extractPath = path.join(retrieveTargetDirPath, name);
        const retrieveCmd = `force:mdapi:retrieve -r ${retrieveTargetDir} -k ${manifestPath} -z -n ${zipName} --json -w 0`;
        const rv1 = execCmd<RetrieveCommandAsyncResult>(retrieveCmd, { ensureExitCode: 0 });
        expect(rv1.jsonOutput, JSON.stringify(rv1)).to.exist;

        const result1 = rv1.jsonOutput.result;

        const reportCmd = 'force:mdapi:retrieve:report --json';
        const rv2 = execCmd<RetrieveCommandResult>(reportCmd, { ensureExitCode: 0 });
        expect(rv2.jsonOutput, JSON.stringify(rv2)).to.exist;

        const result2 = rv2.jsonOutput.result;
        expect(result2.status).to.equal(RequestStatus.Succeeded);
        expect(result2.success).to.be.true;
        expect(result2.id).to.equal(result1.id);
        expect(result2.fileProperties).to.be.an('array').with.length.greaterThan(5);
        const zipFileLocation = path.join(retrieveTargetDirPath, zipName);
        expect(result2.zipFilePath).to.equal(zipFileLocation);
        const retrievedZip = fs.existsSync(path.join(retrieveTargetDirPath, zipName));
        expect(retrievedZip, 'retrieved zip was not in expected path').to.be.true;
        const unzipDir = fs.existsSync(extractPath);
        expect(unzipDir, 'retrieved zip was not extracted to expected path').to.be.true;
        expect(fs.readdirSync(extractPath)).to.deep.equal(['unpackaged']);
      });
    });
  });

  describe('tests that need deployables', () => {
    before(async () => {
      const mdapiOut = 'mdapiOut';
      // make a mdapi directory from the project
      execCmd(`force:source:convert -p force-app --outputdir ${mdapiOut}`, { ensureExitCode: 0 });
      // make a zip from that
      const zip = createArchive('zip', { zlib: { level: 9 } });
      const output = fs.createWriteStream(path.join(session.project.dir, `${mdapiOut}.zip`));
      zip.pipe(output);
      // anywhere not at the root level is fine
      zip.directory(path.join(session.project.dir, mdapiOut), 'mdapiOut');
      await zip.finalize();
    });

    describe('Test stash', () => {
      describe('Deploy zip and report using soap with non default username', () => {
        it('should deploy zip file', () => {
          execCmd<MdDeployResult>(
            'force:mdapi:deploy --zipfile mdapiOut.zip --json --soapdeploy -u nonDefaultOrg --testlevel RunAllTestsInOrg',
            {
              ensureExitCode: 0,
            }
          );
        });

        it('async report from stash', () => {
          // we can't know the exit code so don't use ensureExitCode
          const reportCommandResponse = execCmd<MdDeployResult>(
            'force:mdapi:deploy:report --wait 0 -u nonDefaultOrg --json'
          ).jsonOutput;

          // this output is a change from mdapi:deploy:report which returned NOTHING after the progress bar
          expect(reportCommandResponse.result, JSON.stringify(reportCommandResponse)).to.have.property('status');
          expect(
            [RequestStatus.Pending, RequestStatus.Succeeded, RequestStatus.Failed, RequestStatus.InProgress].includes(
              reportCommandResponse.result.status
            )
          );
        });

        it('request non-verbose deploy report without a deployId', () => {
          const reportCommandResponse = execCmd('force:mdapi:deploy:report --wait 200 -u nonDefaultOrg', {
            ensureExitCode: 0,
          }).shellOutput.stdout;

          // this output is a change from mdapi:deploy:report which returned NOTHING after the progress bar
          expect(reportCommandResponse).to.include('Status: Succeeded', reportCommandResponse);
          expect(reportCommandResponse).to.include('Deployed: ', reportCommandResponse);
        });

        it('request verbose deploy report without a deployId', () => {
          const reportCommandResponse = execCmd(
            'force:mdapi:deploy:report --wait 200 -u nonDefaultOrg --verbose --coverageformatters clover --junit --resultsdir resultsdir',
            {
              ensureExitCode: 0,
            }
          ).shellOutput.stdout;
          // has the basic table output
          expect(reportCommandResponse).to.include('Deployed Source');
          // check for coverage/junit output
          const reportFiles = fs.readdirSync(path.join(session.project.dir, 'resultsdir'));
          expect(reportFiles).to.include('coverage');
          expect(reportFiles).to.include('junit');
        });

        it('async report without a deployId', () => {
          const reportCommandResponse = execCmd('force:mdapi:deploy:report --wait 0 -u nonDefaultOrg', {
            ensureExitCode: 0,
          }).shellOutput.stdout;

          // this output is a change from mdapi:deploy:report which returned NOTHING after the progress bar
          expect(reportCommandResponse).to.include('Status: Succeeded', reportCommandResponse);
          expect(reportCommandResponse).to.include('Deployed: ', reportCommandResponse);
        });
      });

      describe('Deploy directory using default org and request report using jobid parameter from a different org', () => {
        let deployCommandResponse: MdDeployResult;
        it('should deploy a directory', () => {
          deployCommandResponse = execCmd<MdDeployResult>(
            'force:mdapi:deploy --deploydir mdapiOut --json --soapdeploy',
            { ensureExitCode: 0 }
          ).jsonOutput.result;
        });
        it('should fail report', () => {
          const errorReport = execCmd(
            `force:mdapi:deploy:report --wait 200 --jobid ${deployCommandResponse.id} --targetusername nonDefaultOrg`,
            { ensureExitCode: 1 }
          ).shellOutput.stderr;
          expect(errorReport).to.include('INVALID_CROSS_REFERENCE_KEY: invalid cross reference id');
        });
      });

      describe('validate a deployment and deploy that', () => {
        let deployCommandResponse: MdDeployResult;
        it('should check-only deploy a directory with tests', () => {
          deployCommandResponse = execCmd<MdDeployResult>(
            'force:mdapi:deploy --deploydir mdapiOut --json --soapdeploy --checkonly --testlevel RunAllTestsInOrg --wait 100',
            { ensureExitCode: 0 }
          ).jsonOutput.result;
        });
        it('should deploy validated Id', () => {
          execCmd(
            `force:mdapi:deploy --wait -1 --validateddeployrequestid ${deployCommandResponse.id} --ignorewarnings --ignoreerrors`,
            {
              ensureExitCode: 0,
            }
          );
        });
      });
    });
  });
});
