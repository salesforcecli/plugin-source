/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as fs from 'fs';
import * as path from 'path';
import { expect } from 'chai';
import { TestSession, execCmd } from '@salesforce/cli-plugins-testkit';
import { ComponentSet, SourceComponent } from '@salesforce/source-deploy-retrieve';
import { DescribeMetadataResult } from 'jsforce';
import { ConvertCommandResult } from '../../src/formatters/mdapi/convertResultFormatter';

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
      ],
    });
    process.env.SFDX_USE_PROGRESS_BAR = 'false';
  });

  after(async () => {
    await session?.zip(undefined, 'artifacts');
    await session?.clean();
  });

  describe('mdapi:listmetadata', () => {
    it('should successfully execute listmetadata', () => {
      const result = execCmd('force:mdapi:listmetadata --json --metadatatype CustomObject');
      expect(result.jsonOutput.status).to.equal(0);
      expect(result.jsonOutput.result).to.be.an('array').with.length.greaterThan(100);
      expect(result.jsonOutput.result[0]).to.have.property('type', 'CustomObject');
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

  // *** More NUTs will be added/uncommented here as commands are moved from toolbelt to
  //     this plugin.  Keeping these toolbelt tests here for reference.

  // describe('Test stash', () => {
  //   describe('Deploy using soap with non default username', () => {
  //     it('should deploy zip file to the scratch org and request deploy report', () => {
  //       execCmd('force:mdapi:deploy --zipfile unpackaged.zip --json --soapdeploy -u nonDefaultOrg', {
  //         ensureExitCode: 0,
  //       });
  //       const reportCommandResponse = getString(
  //         execCmd('force:mdapi:deploy:report --wait 2 -u nonDefaultOrg', {
  //           ensureExitCode: 0,
  //         }),
  //         'shellOutput.stdout'
  //       );

  //       expect(reportCommandResponse).to.include('Status:  Succeeded', reportCommandResponse);
  //       expect(reportCommandResponse).to.include('Components deployed:  2', reportCommandResponse);
  //     });
  //   });

  //   describe('Retrieve using non default username', () => {
  //     it('should perform retrieve from the scratch org and request retrieve report', () => {
  //       const retrieveCommandResponse = getString(
  //         execCmd(
  //           'force:mdapi:retrieve --retrievetargetdir retrieveDir --unpackaged package.xml --wait 0 -u nonDefaultOrg',
  //           { ensureExitCode: 0 }
  //         ),
  //         'shellOutput.stdout'
  //       );
  //       expect(retrieveCommandResponse).to.include(
  //         'The retrieve request did not complete within the specified wait time'
  //       );

  //       const retrieveReportCommand = getString(
  //         execCmd('force:mdapi:retrieve:report --wait 2 -u nonDefaultOrg', {
  //           ensureExitCode: 0,
  //         }),
  //         'shellOutput.stdout'
  //       );
  //       expect(retrieveReportCommand).to.include('Wrote retrieve zip to');
  //     });
  //   });

  //   describe('Deploy using non default username and request report using jobid parameter', () => {
  //     it('should fail report', () => {
  //       const deployCommandResponse = execCmd<{ id: string }>(
  //         'force:mdapi:deploy --zipfile unpackaged.zip --json --soapdeploy',
  //         { ensureExitCode: 0 }
  //       ).jsonOutput.result;
  //       const reportCommandResponse = getString(
  //         execCmd(
  //           `force:mdapi:deploy:report --wait 2 --jobid ${deployCommandResponse.id} --targetusername nonDefaultOrg`,
  //           { ensureExitCode: 1 }
  //         ),
  //         'shellOutput.stderr'
  //       );
  //       expect(reportCommandResponse).to.include('INVALID_CROSS_REFERENCE_KEY: invalid cross reference id');
  //     });
  //   });
  // });
});
