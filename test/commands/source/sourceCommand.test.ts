/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ComponentSet } from '@salesforce/source-deploy-retrieve';
import { asArray, asString } from '@salesforce/ts-types';
import { stubMethod } from '@salesforce/ts-sinon';
import { expect, $$ } from '@salesforce/command/lib/test';
import { fs } from '@salesforce/core';
import { SinonStub } from 'sinon';
import { FlagOptions, SourceCommand } from '../../../src/sourceCommand';

class sourceCommandTest extends SourceCommand {
  public async run() {}
  public async callCreateCopmonentSet(options: FlagOptions): Promise<ComponentSet> {
    return await this.createComponentSet(options);
  }
}

describe('sourceCommand tests', () => {
  describe('createComponentSet tests', () => {
    const command = new sourceCommandTest([''], null);
    let fromSource: SinonStub;
    let fromManifest: SinonStub;

    beforeEach(() => {
      stubMethod($$.SANDBOX, fs, 'fileExistsSync').returns(true);
      fromSource = stubMethod($$.SANDBOX, ComponentSet, 'fromSource').returns([
        { name: 'MyTest', type: { id: 'apexclass', name: 'ApexClass' }, xml: '', parent: undefined, content: '' },
      ]);
      fromManifest = stubMethod($$.SANDBOX, ComponentSet, 'fromManifestFile').resolves([
        { name: 'MyTest', type: { id: 'apexclass', name: 'ApexClass' }, xml: '', parent: undefined, content: '' },
      ]);
    });

    it('will create appropriate ComponentSet from path', async () => {
      try {
        await command.callCreateCopmonentSet({
          sourcepath: asArray<string>(['force-app']),
          manifest: asString(''),
          metadata: asArray<string>([]),
        });
      } catch (e) {
        // we can't stub everything needed to create a ComponentSet, so expect the constructor to throw
        // but we'll spy on everything and make sure it looks correct
        // we need lots of NUTs
      }
      expect(fromSource.callCount).to.equal(1);
    });

    it('will create appropriate ComponentSet from multiple paths', async () => {
      try {
        await command.callCreateCopmonentSet({
          sourcepath: asArray<string>(['force-app', 'my-app']),
          manifest: asString(''),
          metadata: asArray<string>([]),
        });
      } catch (e) {
        // we can't stub everything needed to create a ComponentSet, so expect the constructor to throw
        // but we'll spy on everything and make sure it looks correct
        // we need lots of NUTs
      }
      expect(fromSource.callCount).to.equal(2);
    });

    it('will create appropriate ComponentSet from packagenames', async () => {
      // TODO: Flush out once we can retrieve via packagenames
    });

    it('will create appropriate ComponentSet from multiple packagenames', async () => {
      // TODO: Flush out once we can retrieve via packagenames
    });

    it('will create appropriate ComponentSet from metadata (ApexClass)', async () => {
      // not sure how to stub ComponentSet constructor
    });

    it('will create appropriate ComponentSet from metadata (ApexClass:MyClass)', async () => {
      // not sure how to stub ComponentSet constructor
    });

    it('will create appropriate ComponentSet from metadata (ApexClass:MyClass,CustomObject,CustomField:MyField', async () => {
      // not sure how to stub ComponentSet constructor
    });

    it('will create appropriate ComponentSet from manifest', async () => {
      try {
        await command.callCreateCopmonentSet({
          sourcepath: asArray<string>([]),
          manifest: asString('manifest.xml'),
          metadata: asArray<string>(['']),
        });
      } catch (e) {
        // we can't stub everything needed to create a ComponentSet, so expect the constructor to throw
        // but we'll spy on everything and make sure it looks correct
        // we need lots of NUTs
      }
      expect(fromManifest.callCount).to.equal(1);
    });
  });
});
