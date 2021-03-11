/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Nutshell } from '../nutshell';

// DO NOT TOUCH. generateNuts.ts will insert these values
const EXECUTABLE = '';

context('Retrieve packagenames NUTs %EXEC%', () => {
  let nutshell: Nutshell;
  let pkg: { id: string; name: string };

  before(async () => {
    nutshell = await Nutshell.create({
      repository: 'https://github.com/mdonnalley/simple-mpd-project.git',
      executable: EXECUTABLE,
      context: __filename,
    });
    pkg = nutshell.installPackage();
  });

  after(async () => {
    await nutshell?.clean();
  });

  describe('--packagenames flag', () => {
    it('should retrieve an installed package', async () => {
      const retrieve = await nutshell.retrieve({ args: `--packagenames "${pkg.name}"` });
      nutshell.expect.retrieveJsonToBeValid(retrieve.result);
      await nutshell.expect.directoryToHaveSomeFiles(pkg.name);
    });

    it('should retrieve an installed package and sourcepath', async () => {
      // todo
    });

    it('should retrieve an installed package and manifest', async () => {
      // todo
    });

    it('should retrieve an installed package and metadata', async () => {
      // todo
    });

    it('should throw an error if the packagenames is not valid', async () => {
      const deploy = await nutshell.retrieve({ args: '--packagenames DOES_NOT_EXIST', exitCode: 1 });
      nutshell.expect.errorToHaveName(deploy, 'mdapiRetrieveFailed');
    });
  });
});
