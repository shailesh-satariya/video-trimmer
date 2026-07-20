import { describe, expect, it } from 'vitest';

import {
  getMinimumTrimGap,
  getRangePercentages,
  updateTrimRange,
} from './trim-range';

describe('updateTrimRange', () => {
  it('updates either handle inside the duration', () => {
    expect(updateTrimRange({ start: 0, end: 10 }, 'start', 2, 10)).toEqual({
      start: 2,
      end: 10,
    });
    expect(updateTrimRange({ start: 2, end: 10 }, 'end', 8, 10)).toEqual({
      start: 2,
      end: 8,
    });
  });

  it('keeps handles ordered with a minimum gap', () => {
    expect(updateTrimRange({ start: 2, end: 5 }, 'start', 7, 10)).toEqual({
      start: 4.9,
      end: 5,
    });
    expect(updateTrimRange({ start: 2, end: 5 }, 'end', 1, 10)).toEqual({
      start: 2,
      end: 2.1,
    });
  });

  it('clamps values to the media duration', () => {
    expect(updateTrimRange({ start: 2, end: 8 }, 'start', -4, 10)).toEqual({
      start: 0,
      end: 8,
    });
    expect(updateTrimRange({ start: 2, end: 8 }, 'end', 20, 10)).toEqual({
      start: 2,
      end: 10,
    });
  });

  it('uses a smaller gap for very short media', () => {
    expect(getMinimumTrimGap(0.2)).toBeCloseTo(0.02);
  });
});

describe('getRangePercentages', () => {
  it('converts seconds to timeline positions', () => {
    expect(getRangePercentages({ start: 2.5, end: 7.5 }, 10)).toEqual({
      start: 25,
      end: 75,
    });
  });
});

