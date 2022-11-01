/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
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
  producer: (T) => Promise<T | T[]>,
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
