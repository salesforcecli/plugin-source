/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
module.exports = {
  extends: [
    'eslint-config-salesforce-typescript',
    'eslint-config-salesforce-license',
    'prettier',
    'plugin:sf-plugin/recommended',
  ],
  ignorePatterns: ['test/nuts/ebikes-lwc/**', 'test/nuts/nestedLWCProject/**'],
  rules: {
    // This rule requires the `strictNullChecks` compiler option to be turned on to function correctly  @typescript-eslint/prefer-nullish-coalescing
    // we never got PS to strict nulls because it's not worth the effort
    '@typescript-eslint/prefer-nullish-coalescing': 'off',
  },
};
