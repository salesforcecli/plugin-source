/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as fs from 'fs';
import { join, resolve } from 'path';
import * as sinon from 'sinon';
import { assert, expect } from 'chai';
import { fromStub, stubInterface, stubMethod } from '@salesforce/ts-sinon';
import { Config } from '@oclif/core';
import { SfProject } from '@salesforce/core';
import { ComponentSetBuilder, MetadataConverter } from '@salesforce/source-deploy-retrieve';
import { Ux } from '@salesforce/sf-plugins-core';
import { Convert } from '../../../src/commands/force/mdapi/convert';
import { FsError } from '../../../src/types';

const testConvertResult = {
  converted: [
    {
      fullName: 'TestProductController',
      type: {
        name: 'ApexClass',
      },
      xml: join('myPkg', 'src', 'classes', 'TestProductController.cls-meta.xml'),
    },
    {
      fullName: 'TestProductController',
      type: {
        name: 'ApexClass',
      },
      content: join('myPkg', 'src', 'classes', 'TestProductController.cls'),
    },
  ],
};

const expectedConvertResult = [
  {
    fullName: 'TestProductController',
    type: 'ApexClass',
    filePath: join('myPkg', 'src', 'classes', 'TestProductController.cls-meta.xml'),
    state: 'Add',
  },
  {
    fullName: 'TestProductController',
    type: 'ApexClass',
    filePath: join('myPkg', 'src', 'classes', 'TestProductController.cls'),
    state: 'Add',
  },
];

const commandName = 'mdapi:convert';

describe(`force:${commandName}`, () => {
  const sandbox = sinon.createSandbox();

  const oclifConfigStub = fromStub(stubInterface<Config>(sandbox));

  const defaultDir = join('my', 'default', 'package');
  let uxLogStub: sinon.SinonStub;
  let uxTableStub: sinon.SinonStub;
  let fsStatStub: sinon.SinonStub;
  let fsMkdirStub: sinon.SinonStub;
  let convertStub: sinon.SinonStub;
  let csBuilderStub: sinon.SinonStub;

  class TestConvert extends Convert {
    public async runIt() {
      await this.init();
      return this.run();
    }
  }

  const runConvertCmd = async (params: string[]) => {
    const cmd = new TestConvert(params, oclifConfigStub);
    cmd.project = SfProject.getInstance();
    sandbox.stub(cmd.project, 'getDefaultPackage').returns({ fullPath: '', name: '', path: defaultDir, default: true });
    return cmd.runIt();
  };

  beforeEach(() => {
    fsMkdirStub = sandbox.stub(fs, 'mkdirSync');
    fsStatStub = sandbox.stub(fs, 'statSync');

    uxLogStub = stubMethod(sandbox, Ux.prototype, 'log');
    uxTableStub = stubMethod(sandbox, Ux.prototype, 'table');

    convertStub = sandbox.stub(MetadataConverter.prototype, 'convert');
    csBuilderStub = sandbox.stub(ComponentSetBuilder, 'build');
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should error when rootdir is not a directory', async () => {
    const fileName = ' imaFile.txt '; // spaces ensure trim() is done
    const trimmedFileName = fileName.trim();
    fsStatStub.returns({ isDirectory: () => false });
    try {
      await runConvertCmd(['--rootdir', fileName]);
      assert(false, `expected ${commandName} to error`);
    } catch (e: unknown) {
      expect((e as Error).name).to.equal('InvalidFlagPath');
      expect((e as Error).message).to.include(trimmedFileName);
    }
  });

  it('should error when outputdir is not a directory', async () => {
    const rootdir = 'rootdir';
    const resolvedRootDir = resolve(rootdir);
    const fileName = ' imaFile.txt '; // spaces ensure trim() is done
    const trimmedFileName = fileName.trim();
    const resolvedFilePath = resolve(trimmedFileName);
    fsStatStub.withArgs(resolvedRootDir).returns({ isDirectory: () => true });
    fsStatStub.withArgs(resolvedFilePath).returns({ isDirectory: () => false });
    try {
      await runConvertCmd(['--rootdir', rootdir, '--outputdir', fileName]);
      assert(false, `expected ${commandName} to error`);
    } catch (e: unknown) {
      expect((e as Error).name).to.equal('InvalidFlagPath');
      expect((e as Error).message).to.include(trimmedFileName);
      expect((e as Error).message).to.include('outputdir');
    }
  });

  it('should error when metadatapath does not exist', async () => {
    const rootdir = 'rootdir';
    const resolvedRootDir = resolve(rootdir);
    const fileName = ' nonexistant.txt '; // spaces ensure trim() is done
    const trimmedFileName = fileName.trim();
    const resolvedFilePath = resolve(trimmedFileName);
    const resolvedOutputDir = resolve(defaultDir);
    fsStatStub.withArgs(defaultDir).returns({ isDirectory: () => true });
    fsStatStub.withArgs(resolvedRootDir).returns({ isDirectory: () => true });
    fsStatStub.withArgs(resolvedOutputDir).returns({ isDirectory: () => true });
    const err = new Error('') as FsError;
    err.code = 'ENOENT';
    fsStatStub.withArgs(resolvedFilePath).throws(err);
    try {
      await runConvertCmd(['--rootdir', rootdir, '--metadatapath', fileName]);
      assert(false, `expected ${commandName} to error`);
    } catch (e: unknown) {
      expect((e as Error).name).to.equal('InvalidFlagPath');
      expect((e as Error).message).to.include(trimmedFileName);
      expect((e as Error).message).to.include('metadatapath');
      expect(fsMkdirStub.called).to.be.false;
    }
  });

  it('should error when manifest does not exist', async () => {
    const rootdir = 'rootdir';
    const resolvedRootDir = resolve(rootdir);
    const fileName = ' nonexistant.txt '; // spaces ensure trim() is done
    const trimmedFileName = fileName.trim();
    const resolvedFilePath = resolve(trimmedFileName);
    const resolvedOutputDir = resolve(defaultDir);
    fsStatStub.withArgs(defaultDir).returns({ isDirectory: () => true });
    fsStatStub.withArgs(resolvedRootDir).returns({ isDirectory: () => true });
    fsStatStub.withArgs(resolvedOutputDir).returns({ isDirectory: () => true });
    const err = new Error('') as FsError;
    err.code = 'ENOENT';
    fsStatStub.withArgs(resolvedFilePath).throws(err);
    try {
      await runConvertCmd(['--rootdir', rootdir, '--manifest', fileName]);
      assert(false, `expected ${commandName} to error`);
    } catch (e: unknown) {
      expect((e as Error).name).to.equal('InvalidFlagPath');
      expect((e as Error).message).to.include(trimmedFileName);
      expect((e as Error).message).to.include('manifest');
      expect(fsMkdirStub.called).to.be.false;
    }
  });

  it('should create the outputdir when it does not exist', async () => {
    const rootdir = 'rootdir';
    const resolvedRootDir = resolve(rootdir);
    const dirName = 'mdGoesHere';
    const resolvedOutputDir = resolve(dirName);
    fsStatStub.withArgs(resolvedRootDir).returns({ isDirectory: () => true });
    const err = new Error('') as FsError;
    err.code = 'ENOENT';
    fsStatStub.withArgs(resolvedOutputDir).throws(err);
    csBuilderStub.resolves({
      getSourceComponents: () => ({ toArray: () => [] }),
    });
    const result = await runConvertCmd(['--rootdir', 'rootdir', '--outputdir', resolvedOutputDir]);
    expect(result).to.deep.equal([]);
    expect(fsMkdirStub.called).to.be.true;
    expect(fsMkdirStub.firstCall.args[0]).to.equal(resolvedOutputDir);
  });

  it('should return an empty array when no metadata converted (json)', async () => {
    csBuilderStub.resolves({
      getSourceComponents: () => ({ toArray: () => [] }),
    });
    fsStatStub.returns({ isDirectory: () => true });
    const result = await runConvertCmd(['--rootdir', 'rootdir', '--json']);
    expect(result).to.deep.equal([]);
    expect(convertStub.called).to.be.false;
    expect(uxLogStub.called).to.be.false;
    expect(uxTableStub.called).to.be.false;
  });

  it('should report when no metadata converted (display)', async () => {
    csBuilderStub.resolves({
      getSourceComponents: () => ({ toArray: () => [] }),
    });
    fsStatStub.returns({ isDirectory: () => true });
    const result = await runConvertCmd(['--rootdir', 'rootdir']);
    expect(result).to.deep.equal([]);
    expect(convertStub.called).to.be.false;
    expect(uxLogStub.calledWith('No metadata found to convert')).to.be.true;
    expect(uxTableStub.called).to.be.false;
  });

  it('should return an array of metadata converted (json)', async () => {
    const mockCompSet = {
      getSourceComponents: () => ({ toArray: () => ['firstComp', 'secondComp'] }),
    };
    fsStatStub.returns({ isDirectory: () => true });
    csBuilderStub.resolves(mockCompSet);
    convertStub.resolves(testConvertResult);
    const result = await runConvertCmd(['--rootdir', 'rootdir', '--json']);
    expect(result).to.deep.equal(expectedConvertResult);
    expect(convertStub.called).to.be.true;
    expect(convertStub.firstCall.args[0]).to.equal(mockCompSet);
    expect(convertStub.firstCall.args[1]).to.equal('source');
    expect(uxLogStub.called).to.be.false;
    expect(uxTableStub.called).to.be.false;
  });

  it('should report a table of metadata converted (display)', async () => {
    const mockCompSet = {
      getSourceComponents: () => ({ toArray: () => ['firstComp', 'secondComp'] }),
    };
    fsStatStub.returns({ isDirectory: () => true });
    csBuilderStub.resolves(mockCompSet);
    convertStub.resolves(testConvertResult);
    const result = await runConvertCmd(['--rootdir', 'rootdir']);
    expect(result).to.deep.equal(expectedConvertResult);
    expect(convertStub.called).to.be.true;
    expect(convertStub.firstCall.args[0]).to.equal(mockCompSet);
    expect(convertStub.firstCall.args[1]).to.equal('source');
    expect(uxLogStub.called).to.be.false;
    expect(uxTableStub.called).to.be.true;
  });
});
