import { describe, expect, it } from 'vitest';

import { getEditListTiming } from './mp4-edit-list';

describe('getEditListTiming', () => {
  it('hides keyframe pre-roll while keeping the requested duration', () => {
    expect(getEditListTiming(3, 1, 0, 1_000, 30_000)).toEqual({
      mediaTime: 30_000,
      segmentDuration: 3_000,
    });
  });

  it('measures the media offset from the rebased decode timeline', () => {
    expect(getEditListTiming(0.9, 3.1, 3, 1_000, 30_000)).toEqual({
      mediaTime: 3_000,
      segmentDuration: 900,
    });
  });
});
