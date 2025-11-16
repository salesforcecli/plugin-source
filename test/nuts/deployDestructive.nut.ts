/*
 * Copyright 2025, Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect } from 'chai';
import { execCmd } from '@salesforce/cli-plugins-testkit';
import { SourceTestkit } from '@salesforce/source-testkit';
import { isNameObsolete } from './shared/isNameObsolete.js';

describe('source:deploy --destructive NUTs', () => {
  let testkit: SourceTestkit;

  const createApexClass = (apexName = 'myApexClass') => {
    // create and deploy an ApexClass that can be deleted without dependency issues
    const output = path.join('force-app', 'main', 'default', 'classes');
    const pathToClass = path.join(testkit.projectDir, output, `${apexName}.cls`);
    execCmd(`force:apex:class:create --classname ${apexName} --outputdir ${output} --api-version 58.0`, {
      ensureExitCode: 0,
      cli: 'sf',
    });
    execCmd(`force:source:deploy -m ApexClass:${apexName}`, { ensureExitCode: 0 });
    return { apexName, output, pathToClass };
  };

  const createManifest = (metadata: string, manifesttype: string) => {
    execCmd(`force:source:manifest:create --metadata ${metadata} --manifesttype ${manifesttype} --api-version 58.0`, {
      ensureExitCode: 0,
      cli: 'sf',
    });
  };

  before(async () => {
    testkit = await SourceTestkit.create({
      nut: fileURLToPath(import.meta.url),
      repository: 'https://github.com/trailheadapps/dreamhouse-lwc.git',
    });
    execCmd('force:source:deploy --sourcepath force-app', { ensureExitCode: 0 });
  });

  after(async () => {
    await testkit?.clean();
  });

  describe('destructive changes POST', () => {
    it('should deploy and then delete an ApexClass ', async () => {
      const { apexName } = createApexClass();
      let deleted = await isNameObsolete(testkit.username, 'ApexClass', apexName);

      expect(deleted).to.be.false;
      createManifest('ApexClass:GeocodingService', 'package');
      createManifest(`ApexClass:${apexName}`, 'post');

      execCmd('force:source:deploy --json --manifest package.xml --postdestructivechanges destructiveChangesPost.xml', {
        ensureExitCode: 0,
      });

      deleted = await isNameObsolete(testkit.username, 'ApexClass', apexName);
      expect(deleted).to.be.true;
    });
  });

  describe('destructive changes PRE', () => {
    it('should delete an ApexClass and then deploy a class', async () => {
      const { apexName } = createApexClass();
      let deleted = await isNameObsolete(testkit.username, 'ApexClass', apexName);

      expect(deleted).to.be.false;
      createManifest('ApexClass:GeocodingService', 'package');
      createManifest(`ApexClass:${apexName}`, 'pre');

      execCmd('force:source:deploy --json --manifest package.xml --predestructivechanges destructiveChangesPre.xml', {
        ensureExitCode: 0,
      });

      deleted = await isNameObsolete(testkit.username, 'ApexClass', apexName);
      expect(deleted).to.be.true;
    });
  });

  describe('destructive changes POST and PRE', () => {
    it('should delete a class, then deploy and then delete an ApexClass', async () => {
      const pre = createApexClass('pre').apexName;
      const post = createApexClass('post').apexName;
      let preDeleted = await isNameObsolete(testkit.username, 'ApexClass', pre);
      let postDeleted = await isNameObsolete(testkit.username, 'ApexClass', post);

      expect(preDeleted).to.be.false;
      expect(postDeleted).to.be.false;
      createManifest('ApexClass:GeocodingService', 'package');
      createManifest(`ApexClass:${post}`, 'post');
      createManifest(`ApexClass:${pre}`, 'pre');

      execCmd(
        'force:source:deploy --json --manifest package.xml --postdestructivechanges destructiveChangesPost.xml --predestructivechanges destructiveChangesPre.xml',
        {
          ensureExitCode: 0,
        }
      );

      preDeleted = await isNameObsolete(testkit.username, 'ApexClass', pre);
      postDeleted = await isNameObsolete(testkit.username, 'ApexClass', post);
      expect(preDeleted).to.be.true;
      expect(postDeleted).to.be.true;
    });
  });

  describe('errors', () => {
    it('should throw an error when a pre destructive flag is passed without the manifest flag', () => {
      const { apexName } = createApexClass();

      createManifest('ApexClass:GeocodingService', 'package');
      createManifest(`ApexClass:${apexName}`, 'pre');

      try {
        execCmd('force:source:deploy --json --sourcepath force-app --predestructivechanges destructiveChangesPre.xml');
      } catch (e) {
        const err = e as Error;
        expect(err).to.not.be.undefined;
        expect(err.message).to.include('Error: --manifest= must also be provided when using --predestructivechanges=');
      }
    });

    it('should throw an error when a post destructive flag is passed without the manifest flag', () => {
      const { apexName } = createApexClass();

      createManifest('ApexClass:GeocodingService', 'package');
      createManifest(`ApexClass:${apexName}`, 'pre');

      try {
        execCmd('force:source:deploy --json --sourcepath force-app --postdestructivechanges destructiveChangesPre.xml');
      } catch (e) {
        const err = e as Error;
        expect(err).to.not.be.undefined;
        expect(err.message).to.include('Error: --manifest= must also be provided when using --postdestructivechanges=');
      }
    });

    it("should throw an error when a destructive manifest is passed that doesn't exist", () => {
      createManifest('ApexClass:GeocodingService', 'package');

      try {
        execCmd('force:source:deploy --json --manifest package.xml --predestructivechanges doesntexist.xml');
      } catch (e) {
        const err = e as Error;
        expect(err).to.not.be.undefined;
        expect(err.message).to.include("ENOENT: no such file or directory, open 'doesntexist.xml'");
      }
    });
  });
});
