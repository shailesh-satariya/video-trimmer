export type EditListTiming = {
  mediaTime: number;
  segmentDuration: number;
};

export function getEditListTiming(
  visibleDurationSec: number,
  mediaStartSec: number,
  timelineOriginSec: number,
  movieTimescale: number,
  trackTimescale: number,
): EditListTiming {
  const mediaOffsetSec = Math.max(0, mediaStartSec - timelineOriginSec);

  return {
    mediaTime: Math.round(mediaOffsetSec * trackTimescale),
    segmentDuration: Math.round(
      Math.max(0, visibleDurationSec) * movieTimescale,
    ),
  };
}
