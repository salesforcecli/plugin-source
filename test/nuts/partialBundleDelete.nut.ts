/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as path from 'path';
import * as fs from 'fs';
import { expect } from 'chai';
import { TestSession, genUniqueString, TestProject, execCmd } from '@salesforce/cli-plugins-testkit';
import { AuthInfo, Connection, SfProject } from '@salesforce/core';
import {
  ComponentSet,
  ComponentSetBuilder,
  ComponentSetOptions,
  MetadataApiRetrieve,
  RetrieveSetOptions,
} from '@salesforce/source-deploy-retrieve';
import { RetrieveCommandResult } from 'src/formatters/retrieveResultFormatter';
import { TestContext } from '@salesforce/core/lib/testSetup';
import { Retrieve } from '../../src/commands/force/source/retrieve';

describe('Partial Bundle Delete Retrieves', () => {
  let session: TestSession;
  let projectPath: string;
  const sandbox = new TestContext().SANDBOX;
  const scratchOrgUsername = genUniqueString('pbdr-test-%s@nut.org');

  before(async () => {
    session = await TestSession.create({
      project: {
        sourceDir: path.join(process.cwd(), 'test', 'nuts', 'partialBundleDeleteProject'),
      },
      devhubAuthStrategy: 'AUTO',
      scratchOrgs: [
        {
          executable: 'sfdx',
          duration: 1,
          setDefault: true,
          wait: 10,
          config: path.join('config', 'project-scratch-def.json'),
          username: scratchOrgUsername,
        },
      ],
    });
    projectPath = path.join(session.project.dir, 'force-app', 'main', 'default');
  });

  after(async () => {
    // await session?.clean();
  });

  afterEach(() => {
    sandbox.restore();
  });

  //
  // NOTE: This test uses stubbed server responses since we can't recreate this scenario
  //       using an API or deploy/retrieve.
  // Test Scenario: This test uses a local project called, "partialBundleDeleteProject" that
  //       has a DigitalBundleExperience. The test retrieves a changed DigitalExperience (forgotPassword)
  //       that doesn't contain a translation file (es.json). This should cause the local translation file
  //       to be deleted and reported as deleted by SDR and the source:retrieve command.
  it('should replace and report local DEB content that was deleted for retrieve', async () => {
    const forgotPasswordDE = path.join(
      projectPath,
      'digitalExperiences',
      'site',
      'source_plugin_nut1',
      'sfdc_cms__view',
      'forgotPassword'
    );
    const forgotPasswordTranslationFile = path.join(forgotPasswordDE, 'es.json');
    expect(fs.existsSync(forgotPasswordTranslationFile)).to.be.true;

    // Create an actual connection to the org we created for the TestSession, then stub
    // retrieve() and checkRetrieveStatus() and others to simulate retrieving a partial bundle delete.
    const connection = await Connection.create({
      authInfo: await AuthInfo.create(session.orgs.get(scratchOrgUsername)),
    });
    sandbox
      .stub(SfProject.prototype, 'getDefaultPackage')
      .returns({ name: session.project.dir, path: session.project.dir, fullPath: session.project.dir });
    sandbox.stub(connection.metadata, 'retrieve').resolves(retrieveResponse);
    sandbox.stub(connection.metadata, 'checkRetrieveStatus').resolves(checkRetrieveStatusResponse);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const csbBuild: (options: ComponentSetOptions) => Promise<ComponentSet> = ComponentSetBuilder.build.bind({});
    sandbox.stub(ComponentSetBuilder, 'build').callsFake(async (opts) => {
      const compSet = await csbBuild(opts);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const compSetRetrieveClone: (options: RetrieveSetOptions) => Promise<MetadataApiRetrieve> =
        compSet.retrieve.bind(compSet);
      sandbox.stub(compSet, 'retrieve').callsFake(() =>
        compSetRetrieveClone({
          usernameOrConnection: connection,
          merge: true,
          output: path.join(session.project.dir, 'force-app'),
        })
      );
      return compSet;
    });
    const result = await Retrieve.run(['-p', forgotPasswordDE, '--json', '-o', scratchOrgUsername]);

    // SDR retrieval code should remove this file
    expect(fs.existsSync(forgotPasswordTranslationFile)).to.be.false;

    // ensure command response
    const expectedResponse = getExpectedCmdJSON(projectPath);
    expect(result.response.success).to.equal(expectedResponse.result.response.success);
    expect(result.response.id).to.equal(expectedResponse.result.response.id);
    expect(result.response.fileProperties).to.deep.equal(expectedResponse.result.response.fileProperties);
    expect(result.inboundFiles).to.have.deep.members(expectedResponse.result.inboundFiles);
  });

  describe('Aura and LWC', () => {
    let dreamhouseProj: TestProject;
    let auraSrcDir: string;
    let lwcSrcDir: string;

    before(() => {
      dreamhouseProj = new TestProject({
        gitClone: 'https://github.com/trailheadapps/dreamhouse-lwc.git',
        destinationDir: session.dir,
      });
      dreamhouseProj.dir = path.join(session.dir, 'dreamhouse-lwc');
      session.stubCwd(dreamhouseProj.dir);
      auraSrcDir = path.join(dreamhouseProj.dir, 'force-app', 'main', 'default', 'aura');
      lwcSrcDir = path.join(dreamhouseProj.dir, 'force-app', 'main', 'default', 'lwc');

      execCmd(`force:source:deploy -p force-app -u ${scratchOrgUsername}`, { ensureExitCode: 0 });
    });

    // This test uses the dreamhouse-lwc repo to add a CSS file to an aura
    // component locally, then retrieve the component from the org which should
    // delete the CSS file added to match the component in the org.
    it('should replace and report local Aura content that was deleted for retrieve', () => {
      const auraPropertyListMapPath = path.join(auraSrcDir, 'auraPropertyListMap');

      // Add another CSS file to the auraPropertyListMap component. This file
      // should be deleted after a retrieve of the component from the org.
      const testCssFile = path.join(auraPropertyListMapPath, 'testFile.css');
      fs.writeFileSync(testCssFile, '.THIS header { display: none; }');
      expect(fs.existsSync(testCssFile)).to.be.true;

      const result = execCmd<RetrieveCommandResult>(
        `force:source:retrieve -p ${auraPropertyListMapPath} -u ${scratchOrgUsername} --json`,
        { ensureExitCode: 0 }
      );

      expect(fs.existsSync(testCssFile)).to.be.false;
      const inboundFiles = result.jsonOutput?.result?.inboundFiles;
      expect(inboundFiles).to.be.an('array').and.not.empty;

      // find the deleted entry for testFile.css
      const deletedFileResponse = inboundFiles.find((fr) => fr.state === 'Deleted');
      expect(deletedFileResponse).to.deep.equal({
        fullName: 'auraPropertyListMap',
        type: 'AuraDefinitionBundle',
        state: 'Deleted',
        filePath: testCssFile,
      });
    });

    // This test uses the dreamhouse-lwc repo to add a CSS file to a LWC
    // component locally, then retrieve the component from the org which should
    // delete the CSS file added to match the component in the org.
    it('should replace and report local LWC content that was deleted for retrieve', () => {
      const propertyTilePath = path.join(lwcSrcDir, 'propertyTile');
      const testsDir = path.join(propertyTilePath, '__tests__');

      // Add another CSS file to the propertyTile component. This file
      // should be deleted after a retrieve of the component from the org.
      const testCssFile = path.join(propertyTilePath, 'testFile.css');
      fs.writeFileSync(testCssFile, '.THIS header { display: none; }');
      expect(fs.existsSync(testCssFile)).to.be.true;
      expect(fs.existsSync(testsDir)).to.be.true;

      const result = execCmd<RetrieveCommandResult>(
        `force:source:retrieve -p ${propertyTilePath} -u ${scratchOrgUsername} --json`,
        { ensureExitCode: 0 }
      );

      expect(fs.existsSync(testCssFile)).to.be.false;
      const inboundFiles = result.jsonOutput?.result?.inboundFiles;
      expect(inboundFiles).to.be.an('array').and.not.empty;

      // find the deleted entry for testFile.css
      const deletedFileResponse = inboundFiles.find((fr) => fr.state === 'Deleted');
      expect(deletedFileResponse).to.deep.equal({
        fullName: 'propertyTile',
        type: 'LightningComponentBundle',
        state: 'Deleted',
        filePath: testCssFile,
      });
      expect(fs.existsSync(testsDir)).to.be.true;
    });

    // This test uses the dreamhouse-lwc repo and retrieves an LWC that has local
    // jest tests in the __tests__ directory.
    it('should not replace forceignored files in a local LWC', () => {
      const brokerCardPath = path.join(lwcSrcDir, 'brokerCard');

      // This dir should NOT be deleted after a retrieve of the component from the org.
      const testsDir = path.join(brokerCardPath, '__tests__');
      expect(fs.existsSync(testsDir)).to.be.true;

      const result = execCmd<RetrieveCommandResult>(
        `force:source:retrieve -p ${brokerCardPath} -u ${scratchOrgUsername} --json`,
        { ensureExitCode: 0 }
      );

      expect(fs.existsSync(testsDir)).to.be.true;
      const inboundFiles = result.jsonOutput?.result?.inboundFiles;
      expect(inboundFiles).to.be.an('array').and.not.empty;
    });
  });
});

// connection.metadata.retrieve stubbed response
const retrieveResponse = {
  done: false,
  id: '09S9A000000YsZxUAK',
  state: 'Queued',
  fileProperties: [],
  messages: [],
  status: '',
  success: false,
  zipFile: '',
};

// connection.metadata.checkRetrieveStatus stubbed response
const checkRetrieveStatusResponse = {
  done: true,
  fileProperties: [
    {
      createdById: '0059A000005ekRSQAY',
      createdByName: 'User User',
      createdDate: '2023-01-06T21:06:57.000Z',
      fileName: 'unpackaged/digitalExperiences/site/source_plugin_nut1/sfdc_cms__view/forgotPassword/_meta.json',
      fullName: 'site/source_plugin_nut1/sfdc_cms__view/forgotPassword/_meta',
      id: '0jd9A000000000BQAQ',
      lastModifiedById: '0059A000005ekRSQAY',
      lastModifiedByName: 'User User',
      lastModifiedDate: '2023-01-06T21:06:57.000Z',
      type: 'DigitalExperienceBundle',
    },
    {
      createdById: '0059A000005ekRSQAY',
      createdByName: 'User User',
      createdDate: '2023-01-06T21:06:57.000Z',
      fileName: 'unpackaged/digitalExperiences/site/source_plugin_nut1/sfdc_cms__view/forgotPassword/content.json',
      fullName: 'site/source_plugin_nut1/sfdc_cms__view/forgotPassword/content',
      id: '0jd9A000000000BQAQ',
      lastModifiedById: '0059A000005ekRSQAY',
      lastModifiedByName: 'User User',
      lastModifiedDate: '2023-01-06T21:06:57.000Z',
      type: 'DigitalExperienceBundle',
    },
    {
      createdById: '0059A000005ekRSQAY',
      createdByName: 'User User',
      createdDate: '2023-01-07T18:58:58.034Z',
      fileName: 'unpackaged/package.xml',
      fullName: 'unpackaged/package.xml',
      id: '',
      lastModifiedById: '0059A000005ekRSQAY',
      lastModifiedByName: 'User User',
      lastModifiedDate: '2023-01-07T18:58:58.034Z',
      manageableState: 'unmanaged',
      type: 'Package',
    },
  ],
  id: '09S9A000000Ysa2UAC',
  status: 'Succeeded',
  success: true,
  zipFile:
    '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',
  messages: [],
};

// Expected JSON from Retrieve command
const getExpectedCmdJSON = (projectPath: string) => ({
  status: 0,
  result: {
    inboundFiles: [
      {
        fullName: path.join('site', 'source_plugin_nut1.sfdc_cms__view', 'forgotPassword'),
        type: 'DigitalExperience',
        state: 'Changed',
        filePath: path.join(
          projectPath,
          'digitalExperiences',
          'site',
          'source_plugin_nut1',
          'sfdc_cms__view',
          'forgotPassword',
          '_meta.json'
        ),
      },
      {
        fullName: path.join('site', 'source_plugin_nut1.sfdc_cms__view', 'forgotPassword'),
        type: 'DigitalExperience',
        state: 'Changed',
        filePath: path.join(
          projectPath,
          'digitalExperiences',
          'site',
          'source_plugin_nut1',
          'sfdc_cms__view',
          'forgotPassword',
          'content.json'
        ),
      },
      {
        fullName: path.join('site', 'source_plugin_nut1.sfdc_cms__view', 'forgotPassword'),
        type: 'DigitalExperience',
        state: 'Deleted',
        filePath: path.join(
          projectPath,
          'digitalExperiences',
          'site',
          'source_plugin_nut1',
          'sfdc_cms__view',
          'forgotPassword',
          'es.json'
        ),
      },
    ],
    packages: [],
    warnings: [],
    response: {
      done: true,
      fileProperties: checkRetrieveStatusResponse.fileProperties,
      id: '09S9A000000Ysa2UAC',
      status: 'Succeeded',
      success: true,
      messages: [],
    },
  },
});
