/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Nutcase } from '../nutcase';

// DO NOT TOUCH. generateNuts.ts will insert these values
const EXECUTABLE = '';

context.skip('MPD NUTs %EXEC%', () => {
  let nutcase: Nutcase;

  before(async () => {
    nutcase = await Nutcase.create({
      repository: 'https://github.com/amphro/simple-mpd-project.git',
      executable: EXECUTABLE,
    });
  });

  after(async () => {
    await nutcase?.clean();
  });

  it('should test something at some point', () => {});
});
