/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { join, resolve } from 'path';
import { Dictionary } from '@salesforce/ts-types';
import { DeployResult, MetadataConverter } from '@salesforce/source-deploy-retrieve';
import * as sinon from 'sinon';
import { expect } from 'chai';
import { Convert } from '../../../src/commands/force/source/convert';
import { FlagOptions } from '../../../src/sourceCommand';

describe('force:source:convert', () => {
  let createComponentSetStub: sinon.SinonStub;
  let deployStub: sinon.SinonStub;

  const defaultDir = join('my', 'default', 'package');
  const myApp = join('new', 'package', 'directory');

  const sandbox = sinon.createSandbox();
  const packageXml = 'package.xml';

  const run = async (flags: Dictionary<boolean | string | number | string[]> = {}): Promise<DeployResult> => {
    // Run the command
    return Convert.prototype.run.call({
      flags: Object.assign({}, flags),
      ux: {
        log: () => {},
        styledHeader: () => {},
        table: () => {},
      },
      logger: {
        debug: () => {},
      },
      project: {
        getDefaultPackage: () => {
          return { path: defaultDir };
        },
      },
      createComponentSet: createComponentSetStub,
    }) as Promise<DeployResult>;
  };

  // Ensure SourceCommand.createComponentSet() args
  const ensureCreateComponentSetArgs = (overrides?: Partial<FlagOptions>) => {
    const defaultArgs = {
      sourcepath: [],
      manifest: undefined,
      metadata: undefined,
    };
    const expectedArgs = { ...defaultArgs, ...overrides };

    expect(createComponentSetStub.calledOnce).to.equal(true);
    expect(createComponentSetStub.firstCall.args[0]).to.deep.equal(expectedArgs);
  };

  beforeEach(() => {
    sandbox.stub(MetadataConverter.prototype, 'convert').resolves({ packagePath: 'temp' });
    createComponentSetStub = sandbox.stub().returns({
      deploy: deployStub,
      getPackageXml: () => packageXml,
      getSourceComponents: () => {
        return {
          toArray: () => {},
        };
      },
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should pass along sourcepath', async () => {
    const sourcepath = ['somepath'];
    const result = await run({ sourcepath, json: true });
    expect(result).to.deep.equal({ location: resolve('temp') });
    ensureCreateComponentSetArgs({ sourcepath });
  });

  it('should call default package dir if no args', async () => {
    const result = await run({ json: true });
    expect(result).to.deep.equal({ location: resolve('temp') });
    ensureCreateComponentSetArgs({ sourcepath: [defaultDir] });
  });

  it('should call with metadata', async () => {
    const result = await run({ metadata: ['ApexClass'], json: true });
    expect(result).to.deep.equal({ location: resolve('temp') });
    ensureCreateComponentSetArgs({ metadata: ['ApexClass'] });
  });

  it('should call with package.xml', async () => {
    const result = await run({ json: true });
    expect(result).to.deep.equal({ location: resolve('temp') });
    ensureCreateComponentSetArgs({ sourcepath: [defaultDir] });
  });

  it('should call default package dir if no args', async () => {
    const result = await run({ json: true });
    expect(result).to.deep.equal({ location: resolve('temp') });
    ensureCreateComponentSetArgs({ sourcepath: [defaultDir] });
  });

  it('should call root dir with rootdir flag', async () => {
    const result = await run({ rootdir: myApp, json: true });
    expect(result).to.deep.equal({ location: resolve('temp') });
    ensureCreateComponentSetArgs({ sourcepath: [myApp] });
  });

  describe('rootdir should be overwritten by any other flag', () => {
    it('sourcepath', async () => {
      const result = await run({ rootdir: myApp, sourcepath: [defaultDir], json: true });
      expect(result).to.deep.equal({ location: resolve('temp') });
      ensureCreateComponentSetArgs({ sourcepath: [defaultDir] });
    });

    it('metadata', async () => {
      const result = await run({ rootdir: myApp, metadata: ['ApexClass', 'CustomObject'], json: true });
      expect(result).to.deep.equal({ location: resolve('temp') });
      ensureCreateComponentSetArgs({ metadata: ['ApexClass', 'CustomObject'] });
    });

    it('package', async () => {
      const result = await run({ rootdir: myApp, manifest: packageXml, json: true });
      expect(result).to.deep.equal({ location: resolve('temp') });
      ensureCreateComponentSetArgs({ manifest: packageXml });
    });
  });
});
