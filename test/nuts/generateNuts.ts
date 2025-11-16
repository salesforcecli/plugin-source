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
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { RepoConfig, TEST_REPOS_MAP } from './testMatrix.js';

const SEED_FILTER = process.env.PLUGIN_SOURCE_SEED_FILTER || '';
const SEED_EXCLUDE = process.env.PLUGIN_SOURCE_SEED_EXCLUDE;

function getSeedFiles(): string[] {
  const seedDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'seeds');
  const files = fs.readdirSync(seedDir);
  return files
    .filter((f) => f.endsWith('.seed.ts'))
    .filter((f) => f.includes(SEED_FILTER))
    .filter((f) => !SEED_EXCLUDE || !f.includes(SEED_EXCLUDE))
    .map((f) => path.resolve(path.join(seedDir, f)));
}

function parseRepoName(repo?: RepoConfig): string {
  return repo ? repo.gitUrl.split('/').reverse()[0].replace('.git', '') : '';
}

function generateNut(generatedDir: string, seedName: string, seedContents: string, repo?: RepoConfig): void {
  const repoName = parseRepoName(repo);
  const nutFileName = repoName ? `${seedName}.${repoName}.nut.ts` : `${seedName}.nut.ts`;
  const nutFilePath = path.join(generatedDir, nutFileName);

  const contents = seedContents.replace(/%REPO_URL%/g, repo?.gitUrl ?? '').replace(/%REPO_NAME%/g, repoName);
  fs.writeFileSync(nutFilePath, contents);
}

function generateNuts(): void {
  const generatedDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'generated');
  fs.rmSync(generatedDir, { recursive: true, force: true });
  fs.mkdirSync(generatedDir, { recursive: true });
  const seeds = getSeedFiles();
  for (const seed of seeds) {
    const seedName = path.basename(seed).replace('.seed.ts', '');
    const seedContents = fs.readFileSync(seed).toString();
    const hasRepo = /const\sREPO\s=\s/.test(seedContents);
    if (hasRepo) {
      const repos = Array.from(TEST_REPOS_MAP.values()).filter((r) => !r.skip);
      for (const repo of repos) {
        generateNut(generatedDir, seedName, seedContents, repo);
      }
    } else {
      generateNut(generatedDir, seedName, seedContents);
    }
  }
}

void generateNuts();
