/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { NutButter } from '../nutButter';

// DO NOT TOUCH. generateNuts.ts will insert these values
const EXECUTABLE = '';

context.skip('MPD NUTs %EXEC%', () => {
  let nutButter: NutButter;

  before(async () => {
    nutButter = await NutButter.create({
      repository: 'https://github.com/amphro/simple-mpd-project.git',
      executable: EXECUTABLE,
    });
  });

  after(async () => {
    await nutButter?.clean();
  });

  it('should test something at some point', () => {});
});
