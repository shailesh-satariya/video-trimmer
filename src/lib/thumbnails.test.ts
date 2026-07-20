import { describe, expect, it } from 'vitest';

import { getThumbnailCount, getThumbnailTimes } from './thumbnails';

describe('getThumbnailCount', () => {
  it('uses a minimum of eight frames', () => {
    expect(getThumbnailCount(320)).toBe(8);
    expect(getThumbnailCount(0)).toBe(8);
  });

  it('scales with width and caps at sixteen frames', () => {
    expect(getThumbnailCount(950)).toBe(10);
    expect(getThumbnailCount(4_000)).toBe(16);
  });
});

describe('getThumbnailTimes', () => {
  it('samples the middle of evenly divided intervals', () => {
    expect(getThumbnailTimes(8, 4)).toEqual([1, 3, 5, 7]);
  });

  it('rejects invalid inputs', () => {
    expect(getThumbnailTimes(0, 8)).toEqual([]);
    expect(getThumbnailTimes(10, 0)).toEqual([]);
  });
});

