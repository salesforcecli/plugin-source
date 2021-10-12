/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import * as os from 'os';
import { expect } from 'chai';
import { execCmd } from '@salesforce/cli-plugins-testkit';
import { SourceTestkit } from '@salesforce/source-testkit';
import { exec } from 'shelljs';

describe('source:delete NUTs', () => {
  const executable = path.join(process.cwd(), 'bin', 'run');
  let testkit: SourceTestkit;

  const createApexClass = (apexName = 'myApexClass') => {
    // create and deploy an ApexClass that can be deleted without dependency issues
    const output = path.join('force-app', 'main', 'default', 'classes');
    const pathToClass = path.join(testkit.projectDir, output, `${apexName}.cls`);
    execCmd(`force:apex:class:create --classname ${apexName} --outputdir ${output}`);
    execCmd(`force:source:deploy -m ApexClass:${apexName}`);
    return { apexName, output, pathToClass };
  };

  const createManifest = (metadata: string, manifesttype: string) => {
    execCmd(`force:source:manifest:create --metadata ${metadata} --manifesttype ${manifesttype}`);
  };

  const query = (
    memberType: string,
    memberName: string
  ): { result: { records: Array<{ IsNameObsolete: boolean }> } } => {
    return JSON.parse(
      exec(
        `sfdx force:data:soql:query -q "SELECT IsNameObsolete FROM SourceMember WHERE MemberType='${memberType}' AND MemberName='${memberName}'" -t --json`,
        { silent: true }
      )
    ) as { result: { records: Array<{ IsNameObsolete: boolean }> } };
  };

  before(async () => {
    testkit = await SourceTestkit.create({
      nut: __filename,
      executable: os.platform() === 'win32' ? executable.replace(/\\/g, '\\\\') : executable,
      repository: 'https://github.com/trailheadapps/dreamhouse-lwc.git',
    });
    execCmd('force:source:deploy --sourcepath force-app');
  });

  after(async () => {
    await testkit?.clean();
  });

  describe('destructive changes POST', () => {
    it('should deploy and then delete an ApexClass ', async () => {
      const { apexName } = createApexClass();
      let soql = query('ApexClass', apexName);

      expect(soql.result.records[0].IsNameObsolete).to.be.false;
      createManifest('ApexClass:GeocodingService', 'package');
      createManifest(`ApexClass:${apexName}`, 'post');

      execCmd('force:source:deploy --json --manifest package.xml --postdestructivechanges destructiveChangesPost.xml', {
        ensureExitCode: 0,
      });

      soql = query('ApexClass', apexName);
      expect(soql.result.records[0].IsNameObsolete).to.be.true;
    });
  });

  describe('destructive changes PRE', () => {
    it('should delete an ApexClass and then deploy a class', async () => {
      const { apexName } = createApexClass();
      let soql = query('ApexClass', apexName);

      expect(soql.result.records[0].IsNameObsolete).to.be.false;
      createManifest('ApexClass:GeocodingService', 'package');
      createManifest(`ApexClass:${apexName}`, 'pre');

      execCmd('force:source:deploy --json --manifest package.xml --predestructivechanges destructiveChangesPre.xml', {
        ensureExitCode: 0,
      });

      soql = query('ApexClass', apexName);
      expect(soql.result.records[0].IsNameObsolete).to.be.true;
    });
  });

  describe('destructive changes POST and PRE', () => {
    it('should delete a class, then deploy and then delete an ApexClass', async () => {
      const pre = createApexClass('pre').apexName;
      const post = createApexClass('post').apexName;
      let soqlPre = query('ApexClass', pre);
      let soqlPost = query('ApexClass', post);

      expect(soqlPre.result.records[0].IsNameObsolete).to.be.false;
      expect(soqlPost.result.records[0].IsNameObsolete).to.be.false;
      createManifest('ApexClass:GeocodingService', 'package');
      createManifest(`ApexClass:${post}`, 'post');
      createManifest(`ApexClass:${pre}`, 'pre');

      execCmd(
        'force:source:deploy --json --manifest package.xml --postdestructivechanges destructiveChangesPost.xml --predestructivechanges destructiveChangesPre.xml',
        {
          ensureExitCode: 0,
        }
      );

      soqlPre = query('ApexClass', pre);
      soqlPost = query('ApexClass', post);
      expect(soqlPre.result.records[0].IsNameObsolete).to.be.true;
      expect(soqlPost.result.records[0].IsNameObsolete).to.be.true;
    });
  });

  describe('errors', () => {
    it('should throw an error when a destructive flag is passed without the manifest flag', () => {
      const { apexName } = createApexClass();
      const soql = query('ApexClass', apexName);

      expect(soql.result.records[0].IsNameObsolete).to.be.false;
      createManifest('ApexClass:GeocodingService', 'package');
      createManifest(`ApexClass:${apexName}`, 'pre');

      try {
        execCmd('force:source:deploy --json --sourcepath force-app --predestructivechanges destructiveChangesPre.xml', {
          ensureExitCode: 0,
        });
      } catch (e) {
        const err = e as Error;
        expect(err).to.not.be.undefined;
        expect(err.message).to.include('Missing one of the following parameters: manifest');
      }
    });
  });
});
