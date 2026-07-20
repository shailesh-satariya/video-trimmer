import { describe, expect, it } from 'vitest';

import {
  getAlignmentNotice,
  getFilenameStem,
  getTrimmedFilename,
  normalizeDownloadFilename,
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

describe('download filename', () => {
  it('separates the editable stem from its extension', () => {
    expect(getFilenameStem('holiday-trimmed.mp4')).toBe('holiday-trimmed');
    expect(getFilenameStem('CLIP.MP4')).toBe('CLIP');
  });

  it('adds one MP4 extension and removes unsafe filename characters', () => {
    expect(normalizeDownloadFilename(' holiday/final?.mp4 ')).toBe(
      'holiday-final.mp4',
    );
    expect(normalizeDownloadFilename('clip.mp4.mp4')).toBe('clip.mp4');
  });

  it('uses a fallback when no usable name remains', () => {
    expect(normalizeDownloadFilename(' ... ')).toBe('video-trimmed.mp4');
  });
});
