export type TrimHandle = 'start' | 'end';

export type TrimRange = {
  start: number;
  end: number;
};

export function getMinimumTrimGap(duration: number): number {
  if (!Number.isFinite(duration) || duration <= 0) {
    return 0;
  }

  return Math.min(0.1, duration / 10);
}

export function updateTrimRange(
  range: TrimRange,
  handle: TrimHandle,
  value: number,
  duration: number,
): TrimRange {
  if (!Number.isFinite(duration) || duration <= 0) {
    return { start: 0, end: 0 };
  }

  const gap = getMinimumTrimGap(duration);
  const nextValue = Number.isFinite(value)
    ? Math.min(duration, Math.max(0, value))
    : handle === 'start'
      ? range.start
      : range.end;

  if (handle === 'start') {
    return {
      start: Math.min(nextValue, range.end - gap),
      end: range.end,
    };
  }

  return {
    start: range.start,
    end: Math.max(nextValue, range.start + gap),
  };
}

export function getRangePercentages(
  range: TrimRange,
  duration: number,
): { start: number; end: number } {
  if (!Number.isFinite(duration) || duration <= 0) {
    return { start: 0, end: 100 };
  }

  return {
    start: (range.start / duration) * 100,
    end: (range.end / duration) * 100,
  };
}
