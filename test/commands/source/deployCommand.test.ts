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
import { expect } from 'chai';
import { getCoverageFormattersOptions } from '../../../src/deployCommand.js';

describe('coverage functions', () => {
  describe('getCoverageFormattersOptions', () => {
    it('clover, json', () => {
      const result = getCoverageFormattersOptions(['clover', 'json']);
      expect(result).to.deep.equal({
        reportFormats: ['clover', 'json'],
        reportOptions: {
          clover: { file: path.join('coverage', 'clover.xml'), projectRoot: '.' },
          json: { file: path.join('coverage', 'coverage.json') },
        },
      });
    });

    it('teamcity', () => {
      const result = getCoverageFormattersOptions(['teamcity']);
      expect(result).to.deep.equal({
        reportFormats: ['teamcity'],
        reportOptions: {
          teamcity: { file: path.join('coverage', 'teamcity.txt'), blockName: 'coverage' },
        },
      });
    });
  });
});
