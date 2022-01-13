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
import { TestSession, execCmd } from '@salesforce/cli-plugins-testkit';
import { ComponentSet, SourceComponent } from '@salesforce/source-deploy-retrieve';
import { DescribeMetadataResult } from 'jsforce';
import { create as createArchive } from 'archiver';
import { RetrieveCommandAsyncResult, RetrieveCommandResult } from 'src/formatters/mdapi/retrieveResultFormatter';
import { ConvertCommandResult } from '../../src/formatters/mdapi/convertResultFormatter';
import { DeployCancelCommandResult } from '../../src/formatters/deployCancelResultFormatter';
import { MdDeployResult } from '../../src/formatters/mdDeployResultFormatter';

let session: TestSession;

const writeManifest = (manifestPath: string, contents?: string) => {
  contents ??= `<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
    <types>
        <members>*</members>
        <name>ApexClass</name>
    </types>
    <version>53.0</version>
</Package>`;
  fs.writeFileSync(manifestPath, contents);
};

describe('mdapi NUTs', () => {
  before(async () => {
    session = await TestSession.create({
      project: {
        gitClone: 'https://github.com/trailheadapps/dreamhouse-lwc.git',
      },
      setupCommands: [
        // default org
        'sfdx force:org:create -d 1 -s -f config/project-scratch-def.json',
        // required if running apex tests (WITH_SECURITY_ENFORCED)
        'sfdx force:source:deploy -p force-app',
        'sfdx force:user:permset:assign -n dreamhouse',
        // non default org
        'sfdx force:org:create -d 1 -f config/project-scratch-def.json -a nonDefaultOrg',
      ],
    });
    process.env.SFDX_USE_PROGRESS_BAR = 'false';
  });

  after(async () => {
    await session?.zip(undefined, 'artifacts');
    await session?.clean();
  });

  describe('mdapi:listmetadata', () => {
    it('should successfully execute listmetadata for type CustomObject', () => {
      const result = execCmd('force:mdapi:listmetadata --json --metadatatype CustomObject');
      expect(result.jsonOutput.status).to.equal(0);
      expect(result.jsonOutput.result).to.be.an('array').with.length.greaterThan(100);
      expect(result.jsonOutput.result[0]).to.have.property('type', 'CustomObject');
    });

    it('should successfully execute listmetadata for type ListView', () => {
      // ListView is sensitive to how the connection.metadata.list() call is made.
      // e.g., if you pass { type: 'ListView', folder: undefined } it will not return
      // any ListViews but if you pass { type: 'ListView' } it returns all ListViews.
      const result = execCmd('force:mdapi:listmetadata --json --metadatatype ListView');
      expect(result.jsonOutput.status).to.equal(0);
      expect(result.jsonOutput.result).to.be.an('array').with.length.greaterThan(10);
      expect(result.jsonOutput.result[0]).to.have.property('type', 'ListView');
    });
  });

  describe('mdapi:describemetadata', () => {
    it('should successfully execute describemetadata', () => {
      const result = execCmd<DescribeMetadataResult>('force:mdapi:describemetadata --json');
      expect(result.jsonOutput.status).to.equal(0);
      const json = result.jsonOutput.result;
      expect(json).to.have.property('metadataObjects');
      const mdObjects = json.metadataObjects;
      expect(mdObjects).to.be.an('array').with.length.greaterThan(100);
      const customLabelsDef = mdObjects.find((md) => md.xmlName === 'CustomLabels');
      expect(customLabelsDef).to.deep.equal({
        childXmlNames: ['CustomLabel'],
        directoryName: 'labels',
        inFolder: false,
        metaFile: false,
        suffix: 'labels',
        xmlName: 'CustomLabels',
      });
    });
  });

  describe('mdapi:beta:convert', () => {
    let convertedToMdPath: string;

    before(() => {
      convertedToMdPath = path.join(session.dir, 'convertedToMdPath_dh');
      execCmd(`force:source:convert --json -d ${convertedToMdPath}`, { ensureExitCode: 0 });
    });

    it('should convert the dreamhouse project', () => {
      const convertedToSrcPath = path.join(session.dir, 'convertedToSrcPath_all');
      const result = execCmd<ConvertCommandResult>(
        `force:mdapi:beta:convert -r ${convertedToMdPath} -d ${convertedToSrcPath} --json`
      );
      expect(result.jsonOutput.status).to.equal(0);
      expect(result.jsonOutput.result).to.be.an('array').with.length.greaterThan(10);
      expect(fs.existsSync(convertedToSrcPath)).to.be.true;
    });

    it('should convert the dreamhouse project using metadata flag', () => {
      const convertedToSrcPath = path.join(session.dir, 'convertedToSrcPath_metadataFlag');
      const result = execCmd<ConvertCommandResult>(
        `force:mdapi:beta:convert -r ${convertedToMdPath} -d ${convertedToSrcPath} -m ApexClass --json`
      );
      expect(result.jsonOutput.status).to.equal(0);
      expect(result.jsonOutput.result).to.be.an('array').with.length.greaterThan(10);
      expect(fs.existsSync(convertedToSrcPath)).to.be.true;
    });

    it('should convert the dreamhouse project using metadatapath flag', () => {
      const convertedToSrcPath = path.join(session.dir, 'convertedToSrcPath_metadatapathFlag');
      const metadataPath = path.join(convertedToMdPath, 'classes', 'PagedResult.cls');
      const result = execCmd<ConvertCommandResult>(
        `force:mdapi:beta:convert -r ${convertedToMdPath} -d ${convertedToSrcPath} -p ${metadataPath} --json`
      );
      expect(result.jsonOutput.status).to.equal(0);
      expect(result.jsonOutput.result).to.be.an('array').with.lengthOf(2);
      expect(fs.existsSync(convertedToSrcPath)).to.be.true;
    });

    it('should convert the dreamhouse project using manifest flag', () => {
      const convertedToSrcPath = path.join(session.dir, 'convertedToSrcPath_manifestFlag');
      const manifestPath = path.join(session.dir, 'manifestFlag-package.xml');
      writeManifest(manifestPath);
      const result = execCmd<ConvertCommandResult>(
        `force:mdapi:beta:convert -r ${convertedToMdPath} -d ${convertedToSrcPath} -x ${manifestPath} --json`
      );
      expect(result.jsonOutput.status).to.equal(0);
      expect(result.jsonOutput.result).to.be.an('array').with.length.greaterThan(10);
      expect(fs.existsSync(convertedToSrcPath)).to.be.true;
    });

    it('should convert the dreamhouse project and back again', () => {
      const convertedToSrcPath = path.join(session.dir, 'convertedToSrcPath_mdapi');
      const convertedToMd2 = path.join(session.dir, 'convertedToMdPath_dh_backAgain');
      const result = execCmd<ConvertCommandResult>(
        `force:mdapi:beta:convert -r ${convertedToMdPath} -d ${convertedToSrcPath} --json`
      );
      expect(result.jsonOutput.status).to.equal(0);
      expect(fs.existsSync(convertedToSrcPath)).to.be.true;

      // Now source:convert back and compare dirs
      execCmd(`force:source:convert --json -r ${convertedToSrcPath} -d ${convertedToMd2}`, { ensureExitCode: 0 });

      const mdCompSet1 = ComponentSet.fromSource(convertedToMdPath);
      const mdCompSet2 = ComponentSet.fromSource(convertedToMd2);
      expect(mdCompSet1.size).to.equal(mdCompSet2.size).and.be.greaterThan(10);
      for (const comp of mdCompSet1) {
        const srcComp2 = mdCompSet2.find(
          (c) => c.fullName === comp.fullName && c.type.name === comp.type.name
        ) as SourceComponent;
        expect(srcComp2).to.be.ok;
        const srcComp = comp as SourceComponent;
        if (srcComp.xml) {
          const size1 = fs.statSync(srcComp.xml).size;
          const size2 = fs.statSync(srcComp2.xml).size;
          expect(size1).to.equal(size2);
        }
        if (srcComp.content) {
          const size1 = fs.statSync(srcComp.content).size;
          const size2 = fs.statSync(srcComp2.content).size;
          // Content files can differ slightly due to compression
          expect(size1 / size2).to.be.within(0.98, 1.02);
        }
      }
    });
  });

  describe('mdapi:deploy:cancel', () => {
    it('will cancel an mdapi deploy via the stash.json', () => {
      execCmd('force:source:convert --outputdir mdapi');
      const deploy = execCmd<{ id: string }>('force:mdapi:deploy -d mdapi -w 0 --json', {
        ensureExitCode: 0,
      }).jsonOutput;
      const result = execCmd<DeployCancelCommandResult>('force:mdapi:deploy:cancel --json');
      expect(result.jsonOutput.status).to.equal(0);
      const json = result.jsonOutput.result;
      expect(json).to.have.property('canceledBy');
      expect(json).to.have.property('status');
      expect(json.status).to.equal('Canceled');
      expect(json.id).to.equal(deploy.result.id);
    });

    it('will cancel an mdapi deploy via the specified deploy id', () => {
      execCmd('force:source:convert --outputdir mdapi');
      const deploy = execCmd<{ id: string }>('force:mdapi:deploy -d mdapi -w 0 --json', {
        ensureExitCode: 0,
      }).jsonOutput;

      const result = execCmd<DeployCancelCommandResult>(`force:mdapi:deploy:cancel --json --jobid ${deploy.result.id}`);
      expect(result.jsonOutput.status).to.equal(0);
      const json = result.jsonOutput.result;
      expect(json).to.have.property('canceledBy');
      expect(json).to.have.property('status');
      expect(json.status).to.equal('Canceled');
      expect(json.id).to.equal(deploy.result.id);
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
        const cmd = `force:mdapi:beta:retrieve -w 10 -r ${retrieveTargetDir} -k ${manifestPath} --json`;
        const rv = execCmd<RetrieveCommandResult>(cmd, { ensureExitCode: 0 });

        // Verify unpackaged.zip exists in retrieveTargetDir
        const retrievedZip = fs.existsSync(retrieveTargetDirPath);
        expect(retrievedZip, 'retrieved zip was not in expected path').to.be.true;
        const result = rv.jsonOutput.result;
        expect(result.status).to.equal('Succeeded');
        expect(result.success).to.be.true;
        expect(result.fileProperties).to.be.an('array').with.length.greaterThan(50);
        const zipFileLocation = path.join(retrieveTargetDirPath, 'unpackaged.zip');
        expect(result.zipFilePath).to.equal(zipFileLocation);
      });

      it('retrieves single package', () => {
        const retrieveTargetDir = 'mdRetrieveSinglePackage';
        const retrieveTargetDirPath = path.join(session.project.dir, retrieveTargetDir);
        const cmd = `force:mdapi:beta:retrieve -w 10 -r ${retrieveTargetDir} -p ${ELECTRON.name} --json`;
        const rv = execCmd<RetrieveCommandResult>(cmd, { ensureExitCode: 0 });

        // Verify unpackaged.zip exists in retrieveTargetDir
        const retrievedZip = fs.existsSync(retrieveTargetDirPath);
        expect(retrievedZip, 'retrieved zip was not in expected path').to.be.true;
        const result = rv.jsonOutput.result;
        expect(result.status).to.equal('Succeeded');
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
        const cmd = `force:mdapi:beta:retrieve -w 10 -r ${retrieveTargetDir} -k ${apexManifestPath} -z -f ${zipName} --json`;
        const rv = execCmd<RetrieveCommandResult>(cmd, { ensureExitCode: 0 });

        // Verify apexClasses.zip exists in retrieveTargetDir
        const retrievedZip = fs.existsSync(path.join(retrieveTargetDirPath, zipName));
        expect(retrievedZip, 'retrieved zip was not in expected path').to.be.true;
        const extractPath = path.join(retrieveTargetDirPath, name);
        const unzipDir = fs.existsSync(extractPath);
        expect(unzipDir, 'retrieved zip was not extracted to expected path').to.be.true;
        expect(fs.readdirSync(extractPath)).to.deep.equal(['unpackaged']);
        const result = rv.jsonOutput.result;
        expect(result.status).to.equal('Succeeded');
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
        const retrieveCmd = `force:mdapi:beta:retrieve -r ${retrieveTargetDir} -k ${manifestPath} --json -w 0`;
        const rv1 = execCmd<RetrieveCommandAsyncResult>(retrieveCmd, { ensureExitCode: 0 });
        const result1 = rv1.jsonOutput.result;
        expect(result1).to.have.property('done', false);
        expect(result1).to.have.property('id');
        expect(result1).to.have.property('state', 'Queued');
        expect(result1).to.have.property('status', 'Queued');
        expect(result1).to.have.property('timedOut', true);

        // Async report, from stash
        let reportCmd = 'force:mdapi:beta:retrieve:report -w 0 --json';
        const rv2 = execCmd<RetrieveCommandAsyncResult>(reportCmd, { ensureExitCode: 0 });
        const result2 = rv2.jsonOutput.result;
        expect(result2).to.have.property('done', false);
        expect(result2).to.have.property('id', result1.id);
        // To prevent flapping we expect 1 of 2 likely states.  All depends
        // on how responsive the message queue is.
        expect(result2.state).to.be.oneOf(['Queued', 'InProgress']);
        expect(result2.status).to.be.oneOf(['Queued', 'InProgress']);
        expect(result2).to.have.property('timedOut', true);

        // Now sync report, from stash
        reportCmd = 'force:mdapi:beta:retrieve:report -w 10 --json';
        const rv3 = execCmd<RetrieveCommandResult>(reportCmd, { ensureExitCode: 0 });
        const result3 = rv3.jsonOutput.result;
        expect(result3.status).to.equal('Succeeded');
        expect(result3.success).to.be.true;
        expect(result3.fileProperties).to.be.an('array').with.length.greaterThan(50);
        const zipFileLocation = path.join(retrieveTargetDirPath, 'unpackaged.zip');
        expect(result3.zipFilePath).to.equal(zipFileLocation);
      });

      it('retrieves report (sync) with overrides of stash', () => {
        const retrieveCmd = `force:mdapi:beta:retrieve -r mdRetrieveReportTmp -k ${manifestPath} --json -w 0`;
        const rv1 = execCmd<RetrieveCommandAsyncResult>(retrieveCmd, { ensureExitCode: 0 });
        const result1 = rv1.jsonOutput.result;

        const name = 'dreamhouse';
        const zipName = `${name}.zip`;
        const retrieveTargetDir = 'mdRetrieveReportOverrides';
        const retrieveTargetDirPath = path.join(session.project.dir, retrieveTargetDir);
        const extractPath = path.join(retrieveTargetDirPath, name);

        const reportCmd = `force:mdapi:beta:retrieve:report -i ${result1.id} -z -f ${zipName} -r ${retrieveTargetDir} --json`;
        const rv2 = execCmd<RetrieveCommandResult>(reportCmd, { ensureExitCode: 0 });
        const result2 = rv2.jsonOutput.result;
        expect(result2.status).to.equal('Succeeded');
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
        const retrieveCmd = `force:mdapi:beta:retrieve -r ${retrieveTargetDir} -k ${manifestPath} -z -f ${zipName} --json -w 0`;
        const rv1 = execCmd<RetrieveCommandAsyncResult>(retrieveCmd, { ensureExitCode: 0 });
        const result1 = rv1.jsonOutput.result;

        const reportCmd = 'force:mdapi:beta:retrieve:report --json';
        const rv2 = execCmd<RetrieveCommandResult>(reportCmd, { ensureExitCode: 0 });
        const result2 = rv2.jsonOutput.result;
        expect(result2.status).to.equal('Succeeded');
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
            'force:mdapi:beta:deploy --zipfile mdapiOut.zip --json --soapdeploy -u nonDefaultOrg',
            {
              ensureExitCode: 0,
            }
          );
        });

        it('request non-verbose deploy report without a deployId', () => {
          const reportCommandResponse = execCmd('force:mdapi:beta:deploy:report --wait 200 -u nonDefaultOrg', {
            ensureExitCode: 0,
          }).shellOutput.stdout;

          // this output is a change from mdapi:deploy:report which returned NOTHING after the progress bar
          expect(reportCommandResponse).to.include('Status: Succeeded', reportCommandResponse);
          expect(reportCommandResponse).to.include('Deployed: ', reportCommandResponse);
        });

        it('request verbose deploy report without a deployId', () => {
          const reportCommandResponse = execCmd(
            'force:mdapi:beta:deploy:report --wait 200 -u nonDefaultOrg --verbose',
            {
              ensureExitCode: 0,
            }
          ).shellOutput.stdout;
          // has the basic table output
          expect(reportCommandResponse).to.include('Deployed Source');
        });
      });

      describe('Deploy directory using default org and request report using jobid parameter from a different org', () => {
        let deployCommandResponse: MdDeployResult;
        it('should deploy a directory', () => {
          deployCommandResponse = execCmd<MdDeployResult>(
            'force:mdapi:beta:deploy --deploydir mdapiOut --json --soapdeploy',
            { ensureExitCode: 0 }
          ).jsonOutput.result;
        });
        it('should fail report', () => {
          const errorReport = execCmd(
            `force:mdapi:beta:deploy:report --wait 200 --jobid ${deployCommandResponse.id} --targetusername nonDefaultOrg`,
            { ensureExitCode: 1 }
          ).shellOutput.stderr;
          expect(errorReport).to.include('INVALID_CROSS_REFERENCE_KEY: invalid cross reference id');
        });
      });

      describe('validate a deployment and deploy that', () => {
        let deployCommandResponse: MdDeployResult;
        it('should check-only deploy a directory with tests', () => {
          deployCommandResponse = execCmd<MdDeployResult>(
            'force:mdapi:beta:deploy --deploydir mdapiOut --json --soapdeploy --checkonly --testlevel RunAllTestsInOrg --wait 100',
            { ensureExitCode: 0 }
          ).jsonOutput.result;
        });
        it('should deploy validated Id', () => {
          execCmd(`force:mdapi:beta:deploy --wait 200 --validateddeployrequestid ${deployCommandResponse.id}`, {
            ensureExitCode: 0,
          });
        });
      });
    });
  });
});
