/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { join as pathJoin } from 'path';
import { fs as fsCore, SfdxError, SfdxProject } from '@salesforce/core';
import { spyMethod, stubMethod } from '@salesforce/ts-sinon';
import { ForceIgnore } from '@salesforce/source-deploy-retrieve';
import * as sinon from 'sinon';
import { expect } from 'chai';
import { Dictionary } from '@salesforce/ts-types';
import { SourceIgnoredCommand, SourceIgnoredResults } from '../../../src/commands/force/source/ignored/list';

describe('source:ignored:list command', () => {
  const packageDirPath = pathJoin('foo', 'bar');
  const packageDirPath2 = pathJoin('main', 'default');
  const packageDirs = [{ path: packageDirPath, default: true }];
  const packageDirsMpd = [{ path: packageDirPath, default: true }, { path: packageDirPath2 }];

  let getUniquePackageDirectoriesStub: sinon.SinonStub;
  let findAndCreateStub: sinon.SinonStub;
  let readdirStub: sinon.SinonStub;
  let statStub: sinon.SinonStub;

  const sandbox = sinon.createSandbox();

  beforeEach(() => {
    getUniquePackageDirectoriesStub = stubMethod(sandbox, SfdxProject.prototype, 'getUniquePackageDirectories');
    findAndCreateStub = stubMethod(sandbox, ForceIgnore, 'findAndCreate');
    readdirStub = stubMethod(sandbox, fsCore, 'readdir');
    statStub = stubMethod(sandbox, fsCore, 'stat');
  });

  afterEach(() => {
    sandbox.restore();
  });

  // eslint-disable-next-line @typescript-eslint/require-await
  const run = async (flags: Dictionary<boolean | string | number> = {}): Promise<SourceIgnoredResults> =>
    // Run the command
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    SourceIgnoredCommand.prototype.run.call({
      flags: Object.assign({}, flags),
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      ux: { log: () => {} },
      logger: {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        debug: () => {},
      },
      ignoredFiles: [],
      project: {
        getPath: () => '',
        getUniquePackageDirectories: getUniquePackageDirectoriesStub,
      },
      statIgnored: spyMethod(sandbox, SourceIgnoredCommand.prototype, 'statIgnored'),
      findIgnored: spyMethod(sandbox, SourceIgnoredCommand.prototype, 'findIgnored'),
      isIgnored: spyMethod(sandbox, SourceIgnoredCommand.prototype, 'isIgnored'),
    });
  it('should list no ignored files by sourcepath', async () => {
    findAndCreateStub.returns({ denies: () => false });
    readdirStub.returns(['something.js', 'nothing.js']);
    statStub
      .onFirstCall()
      .returns({ isDirectory: () => true })
      .onSecondCall()
      .returns({ isDirectory: () => false })
      .onThirdCall()
      .returns({ isDirectory: () => false });
    const result = await run({ sourcepath: packageDirPath });
    expect(result).to.deep.equal({ ignoredFiles: [] });
  });

  it('should list an ignored file by sourcepath', async () => {
    findAndCreateStub.returns({ denies: () => true });
    readdirStub.returns(['something.js']);
    statStub
      .onFirstCall()
      .returns({ isDirectory: () => true })
      .onSecondCall()
      .returns({ isDirectory: () => false });
    const result = await run({ sourcepath: packageDirPath });
    expect(result).to.deep.equal({
      ignoredFiles: [pathJoin(packageDirPath, 'something.js')],
    });
  });

  it('should throw an error with correct message if sourcepath is not valid', async () => {
    try {
      const err = new SfdxError('test', 'test', null, 1);
      err.code = 'ENOENT';
      statStub.onFirstCall().throws(err);
      await run({ sourcepath: 'notValidPath' });
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(err.message).to.equal(
        "File or directory 'notValidPath' doesn't exist in your project. Specify one that exists and rerun the command."
      );
    }
  });

  it('should list all ignored files by default', async () => {
    getUniquePackageDirectoriesStub.returns(packageDirs);
    findAndCreateStub.returns({ denies: () => true });
    readdirStub.returns(['something.js', 'nothing.js']);
    statStub
      .onFirstCall()
      .returns({ isDirectory: () => true })
      .onSecondCall()
      .returns({ isDirectory: () => false })
      .onThirdCall()
      .returns({ isDirectory: () => false });
    const result = await run();
    expect(result).to.deep.equal({
      ignoredFiles: [pathJoin(packageDirPath, 'something.js'), pathJoin(packageDirPath, 'nothing.js')],
    });
  });

  it('should list all ignored files by default and multiple package dirs', async () => {
    getUniquePackageDirectoriesStub.returns(packageDirsMpd);
    findAndCreateStub.returns({ denies: () => true });
    readdirStub.returns(['something.js']);
    statStub
      .withArgs(packageDirPath)
      .returns({ isDirectory: () => true })
      .withArgs(packageDirPath2)
      .returns({ isDirectory: () => true })
      .withArgs(pathJoin(packageDirPath, 'something.js'))
      .returns({ isDirectory: () => false })
      .withArgs(pathJoin(packageDirPath2, 'something.js'))
      .returns({ isDirectory: () => false });
    const result = await run();
    expect(result).to.deep.equal({
      ignoredFiles: [pathJoin(packageDirPath, 'something.js'), pathJoin(packageDirPath2, 'something.js')],
    });
  });
});
