export type TimelineEdit = {
  media_rate_fraction: number;
  media_rate_integer: number;
  media_time: number;
  segment_duration: number;
};

export type TimelineTrack = {
  edits?: TimelineEdit[];
  movie_timescale: number;
  timescale: number;
};

function getEditRate(edit: TimelineEdit): number {
  return edit.media_rate_integer + edit.media_rate_fraction / 65_536;
}

export function movieTimeToMediaTime(
  track: TimelineTrack,
  movieTimeSec: number,
): number {
  const edits = track.edits;
  if (!edits?.length) {
    return movieTimeSec;
  }

  const targetMovieTick = movieTimeSec * track.movie_timescale;
  let movieCursorTick = 0;
  let finalMediaTimeSec: number | undefined;

  for (const edit of edits) {
    const editEndTick = movieCursorTick + edit.segment_duration;

    if (edit.media_time >= 0) {
      const rate = getEditRate(edit);

      if (targetMovieTick < editEndTick) {
        const elapsedMovieSec =
          (targetMovieTick - movieCursorTick) / track.movie_timescale;
        return edit.media_time / track.timescale + elapsedMovieSec * rate;
      }

      if (targetMovieTick === editEndTick) {
        finalMediaTimeSec =
          edit.media_time / track.timescale +
          (edit.segment_duration / track.movie_timescale) * rate;
      }
    }

    movieCursorTick = editEndTick;
  }

  return finalMediaTimeSec ?? movieTimeSec;
}

export function mediaTimeToMovieTime(
  track: TimelineTrack,
  mediaTimeSec: number,
): number {
  const edits = track.edits;
  if (!edits?.length) {
    return mediaTimeSec;
  }

  const targetMediaTick = mediaTimeSec * track.timescale;
  let movieCursorTick = 0;
  let finalMovieTimeSec: number | undefined;

  for (const edit of edits) {
    const rate = getEditRate(edit);

    if (edit.media_time >= 0 && rate > 0) {
      const editMediaDuration =
        (edit.segment_duration / track.movie_timescale) *
        track.timescale *
        rate;
      const editMediaEnd = edit.media_time + editMediaDuration;

      if (
        targetMediaTick >= edit.media_time &&
        targetMediaTick < editMediaEnd
      ) {
        const elapsedMediaSec =
          (targetMediaTick - edit.media_time) / track.timescale;
        return movieCursorTick / track.movie_timescale + elapsedMediaSec / rate;
      }

      if (targetMediaTick === editMediaEnd) {
        finalMovieTimeSec =
          (movieCursorTick + edit.segment_duration) / track.movie_timescale;
      }
    }

    movieCursorTick += edit.segment_duration;
  }

  return finalMovieTimeSec ?? mediaTimeSec;
}
