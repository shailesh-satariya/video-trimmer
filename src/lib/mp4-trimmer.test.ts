import { describe, expect, it } from 'vitest';

import {
  getAlignmentNotice,
  getTrimmedFilename,
} from './mp4-trimmer';

describe('getTrimmedFilename', () => {
  it('replaces the source extension', () => {
    expect(getTrimmedFilename('holiday.MOV')).toBe('holiday-trimmed.mp4');
    expect(getTrimmedFilename('family.video.mp4')).toBe(
      'family.video-trimmed.mp4',
    );
  });

  it('handles files without a useful basename', () => {
    expect(getTrimmedFilename('recording')).toBe('recording-trimmed.mp4');
    expect(getTrimmedFilename('.mp4')).toBe('video-trimmed.mp4');
  });
});

describe('getAlignmentNotice', () => {
  it('describes an earlier keyframe-aligned start', () => {
    expect(getAlignmentNotice(3.5, 2)).toContain('1.500 seconds earlier');
  });

  it('does not report effectively identical starts', () => {
    expect(getAlignmentNotice(2, 2)).toBeUndefined();
    expect(getAlignmentNotice(2, 1.9995)).toBeUndefined();
  });
});

