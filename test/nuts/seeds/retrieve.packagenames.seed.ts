/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import { Nutshell } from '../nutshell';

// DO NOT TOUCH. generateNuts.ts will insert these values
const EXECUTABLE = '';

// https://appexchange.salesforce.com/appxListingDetail?listingId=a0N3u00000MRhyZEAT
const PACKAGE = { id: '04t4x0000000YCSAA2', name: 'Inactivate Contacts V1' };

context('Retrieve packagenames NUTs %EXEC%', () => {
  let nutshell: Nutshell;

  before(async () => {
    nutshell = await Nutshell.create({
      repository: 'https://github.com/mdonnalley/simple-mpd-project.git',
      executable: EXECUTABLE,
      context: __filename,
    });
    nutshell.installPackage(PACKAGE.id);
    await nutshell.deploy({ args: `--sourcepath ${nutshell.packageNames.join(',')}` });
  });

  after(async () => {
    await nutshell?.clean();
  });

  describe('--packagenames flag', () => {
    it('should retrieve an installed package', async () => {
      const retrieve = await nutshell.retrieve({ args: `--packagenames "${PACKAGE.name}"` });
      nutshell.expect.retrieveJsonToBeValid(retrieve.result);
      await nutshell.expect.packagesToBeRetrieved(retrieve.result, PACKAGE.name);
    });

    it('should retrieve an installed package and sourcepath', async () => {
      const retrieve = await nutshell.retrieve({
        args: `--packagenames "${PACKAGE.name}" --sourcepath "${path.join('force-app', 'main', 'default', 'apex')}"`,
      });
      nutshell.expect.retrieveJsonToBeValid(retrieve.result);
      await nutshell.expect.packagesToBeRetrieved(retrieve.result, PACKAGE.name);
      await nutshell.expect.filesToBeRetrieved(retrieve.result, [
        `${PACKAGE.name}/**/labels/*-meta.xml`,
        `${PACKAGE.name}/**/objects/*__c/*-meta.xml`,
        `${PACKAGE.name}/**/flows/*-meta.xml`,
      ]);
    });

    it('should retrieve an installed package and metadata', async () => {
      const retrieve = await nutshell.retrieve({
        args: `--packagenames "${PACKAGE.name}" --metadata CustomObject`,
      });
      nutshell.expect.retrieveJsonToBeValid(retrieve.result);
      await nutshell.expect.packagesToBeRetrieved(retrieve.result, PACKAGE.name);
    });

    // This test fails because of an existing bug
    it.skip('should retrieve an installed package and manifest', async () => {
      const convert = await nutshell.convert({ args: '--sourcepath force-app --outputdir out' });
      const packageXml = path.join(convert.result.location, 'package.xml');
      const retrieve = await nutshell.retrieve({
        args: `--packagenames "${PACKAGE.name}" --manifest ${packageXml}`,
      });
      nutshell.expect.retrieveJsonToBeValid(retrieve.result);
      await nutshell.expect.packagesToBeRetrieved(retrieve.result, PACKAGE.name);
    });

    it('should throw an error if the packagenames is not valid', async () => {
      const deploy = await nutshell.retrieve({ args: '--packagenames DOES_NOT_EXIST', exitCode: 1 });
      nutshell.expect.errorToHaveName(deploy, 'mdapiRetrieveFailed');
    });
  });
});
