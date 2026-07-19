import { describe, expect, it } from 'vitest';

import {
  formatBytes,
  getVideoFormat,
  getVideoSizeNotice,
  validateVideoFile,
  type VideoFileInfo,
} from './video-file';

function videoFile(overrides: Partial<VideoFileInfo> = {}): VideoFileInfo {
  return {
    name: 'holiday.mp4',
    size: 25_000_000,
    type: 'video/mp4',
    ...overrides,
  };
}

describe('validateVideoFile', () => {
  it('accepts MP4 and MOV files', () => {
    expect(validateVideoFile(videoFile())).toBeUndefined();
    expect(
      validateVideoFile(
        videoFile({ name: 'clip.MOV', type: 'video/quicktime' }),
      ),
    ).toBeUndefined();
  });

  it('uses the extension when the browser omits the MIME type', () => {
    expect(validateVideoFile(videoFile({ type: '' }))).toBeUndefined();
  });

  it('rejects empty and unsupported files', () => {
    expect(validateVideoFile(videoFile({ size: 0 }))).toContain('empty');
    expect(
      validateVideoFile(
        videoFile({ name: 'clip.webm', type: 'video/webm' }),
      ),
    ).toContain('Unsupported');
  });

  it('rejects a misleading extension and MIME combination', () => {
    expect(
      validateVideoFile(videoFile({ name: 'notes.mp4', type: 'text/plain' })),
    ).toContain('Unsupported');
  });
});

describe('video file presentation', () => {
  it('formats decimal file sizes', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1_250_000)).toBe('1.3 MB');
    expect(formatBytes(2_000_000_000)).toBe('2.0 GB');
  });

  it('derives a readable format label', () => {
    expect(getVideoFormat('camera.MOV')).toBe('MOV');
  });

  it('warns about large files without rejecting them', () => {
    expect(getVideoSizeNotice(999_999_999)).toBeUndefined();
    expect(getVideoSizeNotice(1_000_000_000)).toContain('significant memory');
  });
});

