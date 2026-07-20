export type VideoFileInfo = Pick<File, 'name' | 'size' | 'type'>;

const supportedExtensions = new Set(['mp4', 'mov']);
const supportedMimeTypes = new Set([
  'application/mp4',
  'video/mp4',
  'video/quicktime',
]);
const largeFileThreshold = 1_000_000_000;

function getExtension(filename: string): string {
  const separator = filename.lastIndexOf('.');
  return separator >= 0 ? filename.slice(separator + 1).toLowerCase() : '';
}

export function validateVideoFile(file: VideoFileInfo): string | undefined {
  if (file.size === 0) {
    return 'This file is empty. Choose a video that contains media data.';
  }

  const extension = getExtension(file.name);
  const mimeType = file.type.toLowerCase().split(';', 1)[0] ?? '';
  const hasSupportedExtension = supportedExtensions.has(extension);
  const hasSupportedMime = supportedMimeTypes.has(mimeType);

  if (!hasSupportedExtension || (mimeType !== '' && !hasSupportedMime)) {
    return 'Unsupported file type. Choose an MP4 or MOV video.';
  }

  return undefined;
}

export function getVideoFormat(filename: string): string {
  const extension = getExtension(filename);
  return extension === '' ? 'Video' : extension.toUpperCase();
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1_000)),
    units.length - 1,
  );
  const unit = units[unitIndex] ?? 'B';
  const value = bytes / 1_000 ** unitIndex;
  const digits = value >= 100 || unitIndex === 0 ? 0 : 1;

  return `${value.toFixed(digits)} ${unit}`;
}

export function getVideoSizeNotice(size: number): string | undefined {
  if (size < largeFileThreshold) {
    return undefined;
  }

  return 'Large video: trimming may require significant memory on this device.';
}
