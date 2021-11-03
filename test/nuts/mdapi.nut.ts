/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { expect } from 'chai';

import { TestSession, execCmd } from '@salesforce/cli-plugins-testkit';

let session: TestSession;

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
      expect(result.jsonOutput.result)
        .to.be.an('array')
        .with.length.greaterThan(100);
      expect(result.jsonOutput.result[0])
        .to.have.property('type', 'CustomObject');
    });
  });

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

  // describe('mdapiDescribemetadataCommand', () => {
  //   it('should successfully execute describemetadata', () => {
  //     const result = execCmd('force:mdapi:describemetadata --json');
  //     expect(result.jsonOutput.status).to.equal(0);
  //     const json = result.jsonOutput.result as any;
  //     expect(json).to.have.property('metadataObjects');
  //     const mdObjects: any[] = json.metadataObjects;
  //     expect(mdObjects)
  //       .to.be.an('array')
  //       .with.length.greaterThan(100);
  //     const customLabelsDef = mdObjects.find(md => md.xmlName === 'CustomLabels');
  //     expect(customLabelsDef).to.deep.equal({
  //       childXmlNames: ['CustomLabel'],
  //       directoryName: 'labels',
  //       inFolder: false,
  //       metaFile: false,
  //       suffix: 'labels',
  //       xmlName: 'CustomLabels'
  //     })
  //   });
  // });

});
