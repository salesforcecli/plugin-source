/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { expect } from 'chai';
import { promisesQueue } from '../src/promiseQueue';
describe('promisesQueue', () => {
  const numberResolver = (n: number) => Promise.resolve(n);
  it('should handle 0 queue entries', async () => {
    const results = await promisesQueue([], numberResolver, 1);
    expect(results).to.deep.equal([]);
  });
  it('should handle many queue entries', async () => {
    const results = await promisesQueue([1], numberResolver, 1);
    expect(results).to.have.length(1);
    expect(results[0]).to.equal(1);
  });
  it('should handle 500 queue entry one at a time', async () => {
    const a = Array.from({ length: 500 }, (v, i) => i);
    const results = await promisesQueue(a, numberResolver, 1);
    expect(results).to.have.length(500);
    expect(results[499]).to.equal(499);
  });
  it('should handle 500 queue entry 10 at a time', async () => {
    const a = Array.from({ length: 500 }, (v, i) => i);
    const results = await promisesQueue(a, numberResolver, 10);
    expect(results).to.have.length(500);
    expect(results[499]).to.equal(499);
  });
  it('should handle 500 queue entry 500 at a time', async () => {
    const a = Array.from({ length: 500 }, (v, i) => i);
    const results = await promisesQueue(a, numberResolver, 500);
    expect(results).to.have.length(500);
    expect(results[499]).to.equal(499);
  });
  it('should reject at entry two', async () => {
    await promisesQueue(
      [1, 2],
      (n: number): Promise<number> => (n === 2 ? Promise.reject(n) : Promise.resolve(n)),
      1
    ).catch((e) => expect(e).to.equal(2));
  });
  it('should queue 250 more with a total of 750 promises', async () => {
    let count = 0;
    const moreResolver = (n: number): Promise<number | number[]> => {
      const rn = n === 0 && count === 0 ? Array.from({ length: 250 }, (v, i) => i + 500) : n;
      count++;
      return Promise.resolve(count < 502 ? rn : []);
    };
    const a = Array.from({ length: 500 }, (v, i) => i);
    const results = await promisesQueue(a, moreResolver, 500, true);
    expect(results).to.have.length(750);
  });
  it('should handle 5000 queue entry 100 at a time', async () => {
    const a = Array.from({ length: 5000 }, (v, i) => i);
    const results = await promisesQueue(a, numberResolver, 100);
    expect(results).to.have.length(5000);
    expect(results[499]).to.equal(499);
  });
});
