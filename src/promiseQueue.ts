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
import { ensureArray } from '@salesforce/kit';

/**
 * Function to throttle a list of promises.
 *
 * @param sourceQueue - The list of items to process.
 * @param producer - The function to produce a promise from an item.
 * @param concurrency - The number of promises to run at a time.
 * @param queueResults - Whether to queue the results of the promises.
 */
export async function promisesQueue<T>(
  sourceQueue: T[],
  producer: (arg0: T) => Promise<T | T[]>,
  concurrency: number,
  queueResults = false
): Promise<T[]> {
  const results: T[] = [];
  let queue = [...sourceQueue];
  while (queue.length > 0) {
    const next = queue.slice(0, concurrency);
    queue = queue.slice(concurrency);
    // eslint-disable-next-line no-await-in-loop
    const nextResults = (await Promise.all(ensureArray(next.map(producer))))
      .flat(1)
      .filter((val) => val !== undefined) as T[];
    if (queueResults) {
      queue.push(...nextResults);
    }
    results.push(...nextResults);
  }
  return results;
}
