import { describe, expect, it } from 'vitest';

import {
  mediaTimeToMovieTime,
  movieTimeToMediaTime,
  type TimelineTrack,
} from './mp4-timeline';

const trackWithLeadIn: TimelineTrack = {
  edits: [
    {
      media_rate_fraction: 0,
      media_rate_integer: 1,
      media_time: 2_002,
      segment_duration: 3_033,
    },
  ],
  movie_timescale: 600,
  timescale: 30_000,
};

describe('MP4 edit-list timeline conversion', () => {
  it('maps a movie selection to the underlying media timeline', () => {
    expect(movieTimeToMediaTime(trackWithLeadIn, 1)).toBeCloseTo(
      32_002 / 30_000,
    );
  });

  it('maps a media keyframe back to its visible movie time', () => {
    expect(mediaTimeToMovieTime(trackWithLeadIn, 2_002 / 30_000)).toBeCloseTo(
      0,
    );
  });

  it('maps the final edit boundary instead of falling back to raw time', () => {
    expect(movieTimeToMediaTime(trackWithLeadIn, 3_033 / 600)).toBeCloseTo(
      (2_002 + (3_033 / 600) * 30_000) / 30_000,
    );
  });

  it('uses direct timestamps when the source has no edits', () => {
    const plainTrack = {
      movie_timescale: 1_000,
      timescale: 90_000,
    };

    expect(movieTimeToMediaTime(plainTrack, 2.5)).toBe(2.5);
    expect(mediaTimeToMovieTime(plainTrack, 2.5)).toBe(2.5);
  });
});
