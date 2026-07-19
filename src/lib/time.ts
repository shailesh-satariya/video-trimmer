export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '00:00.000';
  }

  const milliseconds = Math.floor(seconds * 1_000);
  const hours = Math.floor(milliseconds / 3_600_000);
  const minutes = Math.floor((milliseconds % 3_600_000) / 60_000);
  const remainingSeconds = Math.floor((milliseconds % 60_000) / 1_000);
  const remainingMilliseconds = milliseconds % 1_000;

  const clock = [
    hours > 0 ? String(hours).padStart(2, '0') : null,
    String(minutes).padStart(2, '0'),
    String(remainingSeconds).padStart(2, '0'),
  ]
    .filter((part) => part !== null)
    .join(':');

  return `${clock}.${String(remainingMilliseconds).padStart(3, '0')}`;
}

