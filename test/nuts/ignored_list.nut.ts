/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { expect } from 'chai';
import { AuthStrategy } from '@salesforce/cli-plugins-testkit/lib/hubAuth';
import { SourceIgnoredResults } from '../../src/commands/force/source/ignored/list';

describe('force:source:ignored:list', () => {
  let session: TestSession;
  let forceIgnorePath: string;
  let originalForceIgnore;

  const pathToIgnoredFile1 = path.join('foo-bar', 'app', 'classes', 'FooBar.cls');
  const pathToIgnoredFile2 = path.join('foo-bar', 'app', 'classes', 'FooBar.cls-meta.xml');

  before(async () => {
    session = await TestSession.create({
      project: {
        gitClone: 'https://github.com/salesforcecli/sample-project-multiple-packages',
      },
      authStrategy: AuthStrategy.NONE,
    });
    forceIgnorePath = path.join(session.project.dir, '.forceignore');
    originalForceIgnore = await fs.promises.readFile(forceIgnorePath, 'utf8');
  });

  after(async () => {
    await session?.clean();
  });

  describe('no forceignore', () => {
    before(async () => {
      await fs.promises.rm(forceIgnorePath);
    });
    after(async () => {
      await fs.promises.writeFile(forceIgnorePath, originalForceIgnore);
    });
    it('default PkgDir', () => {
      const result = execCmd<SourceIgnoredResults>('force:source:ignored:list --json', { ensureExitCode: 0 }).jsonOutput
        .result;
      expect(result.ignoredFiles).to.deep.equal([]);
    });
    it('specified sourcePath', () => {
      const result2 = execCmd<SourceIgnoredResults>('force:source:ignored:list --json -p foo-bar', {
        ensureExitCode: 0,
      }).jsonOutput.result;
      expect(result2.ignoredFiles).to.deep.equal([]);
    });
  });

  describe('no files are ignored (empty forceignore)', () => {
    before(async () => {
      await fs.promises.writeFile(forceIgnorePath, '');
    });
    after(async () => {
      await fs.promises.writeFile(forceIgnorePath, originalForceIgnore);
    });
    it('default PkgDir', () => {
      const result = execCmd<SourceIgnoredResults>('force:source:ignored:list --json', { ensureExitCode: 0 }).jsonOutput
        .result;
      expect(result.ignoredFiles).to.deep.equal([]);
    });
    it('specified sourcePath', () => {
      const result2 = execCmd<SourceIgnoredResults>('force:source:ignored:list --json -p foo-bar', {
        ensureExitCode: 0,
      }).jsonOutput.result;
      expect(result2.ignoredFiles).to.deep.equal([]);
    });
  });

  describe('returns an ignored class using specified path in forceignore', () => {
    before(async () => {
      // forceignore uses a library that wants ignore rules in posix format.
      await fs.promises.appendFile(
        forceIgnorePath,
        `${path.normalize(pathToIgnoredFile1).split(path.sep).join(path.posix.sep)}${os.EOL}`
      );
      await fs.promises.appendFile(
        forceIgnorePath,
        `${path.normalize(pathToIgnoredFile2).split(path.sep).join(path.posix.sep)}${os.EOL}`
      );
    });
    after(async () => {
      await fs.promises.writeFile(forceIgnorePath, originalForceIgnore);
    });
    it('default PkgDir', () => {
      const result = execCmd<SourceIgnoredResults>('force:source:ignored:list --json', { ensureExitCode: 0 }).jsonOutput
        .result;
      expect(result.ignoredFiles).to.include(pathToIgnoredFile1);
      expect(result.ignoredFiles).to.include(pathToIgnoredFile2);
    });
    it('specified sourcePath', () => {
      const result2 = execCmd<SourceIgnoredResults>('force:source:ignored:list --json -p foo-bar', {
        ensureExitCode: 0,
      }).jsonOutput.result;
      expect(result2.ignoredFiles).to.include(pathToIgnoredFile1);
      expect(result2.ignoredFiles).to.include(pathToIgnoredFile2);
    });
  });

  describe('returns an ignored class using wildcards', () => {
    before(async () => {
      await fs.promises.appendFile(forceIgnorePath, '**/FooBar.*');
    });
    after(async () => {
      await fs.promises.writeFile(forceIgnorePath, originalForceIgnore);
    });

    it('default PkgDir', () => {
      const result = execCmd<SourceIgnoredResults>('force:source:ignored:list --json', { ensureExitCode: 0 }).jsonOutput
        .result;
      expect(result.ignoredFiles).to.include(pathToIgnoredFile1);
      expect(result.ignoredFiles).to.include(pathToIgnoredFile2);
    });
    it('specified sourcePath', () => {
      const result2 = execCmd<SourceIgnoredResults>('force:source:ignored:list --json -p foo-bar', {
        ensureExitCode: 0,
      }).jsonOutput.result;
      expect(result2.ignoredFiles).to.include(pathToIgnoredFile1);
      expect(result2.ignoredFiles).to.include(pathToIgnoredFile2);
    });
  });

  describe('returns an ignored non-metadata component', () => {
    const lwcDir = path.join('foo-bar', 'app', 'lwc');
    const lwcConfigPath = path.join(lwcDir, 'jsconfig.json');

    before(async () => {
      await fs.promises.mkdir(path.join(session.project.dir, lwcDir), { recursive: true });
      await fs.promises.writeFile(path.join(session.project.dir, lwcConfigPath), '{}');
    });
    after(async () => {
      await fs.promises.writeFile(forceIgnorePath, originalForceIgnore);
    });

    it('default PkgDir', () => {
      const result = execCmd<SourceIgnoredResults>('force:source:ignored:list --json', { ensureExitCode: 0 }).jsonOutput
        .result;
      expect(result.ignoredFiles).to.include(lwcConfigPath);
    });
    it('specified sourcePath', () => {
      const result2 = execCmd<SourceIgnoredResults>('force:source:ignored:list --json -p foo-bar', {
        ensureExitCode: 0,
      }).jsonOutput.result;
      expect(result2.ignoredFiles).to.include(lwcConfigPath);
    });
  });
});
