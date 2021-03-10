/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as os from 'os';
import * as path from 'path';
import * as util from 'util';
import { fs } from '@salesforce/core';
import { EXECUTABLES, TEST_REPOS, RepoConfig } from './testMatrix';

const SEED_FILTER = process.env.PLUGIN_SOURCE_SEED_FILTER || '';

async function getSeedFiles(): Promise<string[]> {
  const seedDir = path.join(__dirname, 'seeds');
  const files = await fs.readdir(seedDir);
  const seeds = files
    .filter((f) => f.endsWith('.seed.ts'))
    .filter((f) => f.includes(SEED_FILTER))
    .map((f) => path.resolve(path.join(seedDir, f)));
  return seeds;
}

function buildRepoString(repo: RepoConfig): string {
  const repoString = `/* eslint-disable prettier/prettier */${os.EOL}const REPO = ${util.inspect(repo, {
    breakLength: 80,
    depth: 6,
  })} as RepoConfig;${os.EOL}`;
  return repoString;
}

function parseRepoName(repo?: RepoConfig): string {
  return repo ? repo.gitUrl.split('/').reverse()[0].replace('.git', '') : '';
}

async function generateNut(
  generatedDir: string,
  seedName: string,
  seedContents: string,
  executable: string,
  repo?: RepoConfig
): Promise<void> {
  const repoName = parseRepoName(repo);
  const executableName = path.basename(executable);
  const nutFileName = repoName
    ? `${seedName}.${repoName}.${executableName}.nut.ts`
    : `${seedName}.${executableName}.nut.ts`;
  const nutFilePath = path.join(generatedDir, nutFileName);
  const repoString = repo ? buildRepoString(repo) : '';
  const executableString = `const EXECUTABLE = '${executable}';${os.EOL}`;
  const contents = seedContents
    .replace(/const\sREPO\s=\s(.*?)\n/, repoString)
    .replace(/const\sEXECUTABLE\s=\s(.*?)\n/, executableString)
    .replace(/%REPO%/, `[repo: ${repoName}]`)
    .replace(/%EXEC%/, `[exec: ${executable}]`);
  await fs.writeFile(nutFilePath, contents);
}

async function generateNuts(): Promise<void> {
  const generatedDir = path.resolve(__dirname, 'generated');
  await fs.rmdir(generatedDir, { recursive: true });
  await fs.mkdirp(generatedDir);
  const seeds = await getSeedFiles();
  for (const seed of seeds) {
    const seedName = path.basename(seed).replace('.seed.ts', '');
    const seedContents = await fs.readFile(seed, 'UTF-8');
    for (const executable of EXECUTABLES.filter((e) => !e.skip)) {
      const hasRepo = /const\sREPO\s=\s(.*?)\n/.test(seedContents);
      if (hasRepo) {
        for (const repo of TEST_REPOS.filter((r) => !r.skip)) {
          await generateNut(generatedDir, seedName, seedContents, executable.path, repo);
        }
      } else {
        await generateNut(generatedDir, seedName, seedContents, executable.path);
      }
    }
  }
}

void generateNuts();
