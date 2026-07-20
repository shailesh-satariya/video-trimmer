export type GeneratedThumbnail = {
  time: number;
  url: string;
};

type GenerateThumbnailOptions = {
  count: number;
  duration: number;
  signal: AbortSignal;
  sourceUrl: string;
  onThumbnail: (thumbnail: GeneratedThumbnail) => void;
};

const thumbnailWidth = 160;
const thumbnailHeight = 90;
const seekTimeoutMs = 8_000;

export function getThumbnailCount(timelineWidth: number): number {
  if (!Number.isFinite(timelineWidth) || timelineWidth <= 0) {
    return 8;
  }

  return Math.min(16, Math.max(8, Math.ceil(timelineWidth / 100)));
}

export function getThumbnailTimes(duration: number, count: number): number[] {
  if (
    !Number.isFinite(duration) ||
    duration <= 0 ||
    !Number.isInteger(count) ||
    count <= 0
  ) {
    return [];
  }

  return Array.from(
    { length: count },
    (_, index) => ((index + 0.5) / count) * duration,
  );
}

function abortError(): DOMException {
  return new DOMException('Thumbnail generation was cancelled', 'AbortError');
}

function waitForVideoEvent(
  video: HTMLVideoElement,
  eventName: 'loadeddata' | 'seeked',
  signal: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(abortError());
      return;
    }

    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for video ${eventName}`));
    }, seekTimeoutMs);

    const onAbort = () => {
      cleanup();
      reject(abortError());
    };
    const onError = () => {
      cleanup();
      reject(new Error('The browser could not decode a thumbnail frame'));
    };
    const onEvent = () => {
      cleanup();
      resolve();
    };
    const cleanup = () => {
      window.clearTimeout(timeout);
      signal.removeEventListener('abort', onAbort);
      video.removeEventListener('error', onError);
      video.removeEventListener(eventName, onEvent);
    };

    signal.addEventListener('abort', onAbort, { once: true });
    video.addEventListener('error', onError, { once: true });
    video.addEventListener(eventName, onEvent, { once: true });
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  signal: AbortSignal,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(abortError());
      return;
    }

    canvas.toBlob(
      (blob) => {
        if (signal.aborted) {
          reject(abortError());
        } else if (blob) {
          resolve(blob);
        } else {
          reject(new Error('The browser could not create a thumbnail'));
        }
      },
      'image/jpeg',
      0.72,
    );
  });
}

function drawCoverFrame(
  context: CanvasRenderingContext2D,
  video: HTMLVideoElement,
): void {
  const videoRatio = video.videoWidth / video.videoHeight;
  const canvasRatio = thumbnailWidth / thumbnailHeight;
  let sourceX = 0;
  let sourceY = 0;
  let sourceWidth = video.videoWidth;
  let sourceHeight = video.videoHeight;

  if (videoRatio > canvasRatio) {
    sourceWidth = video.videoHeight * canvasRatio;
    sourceX = (video.videoWidth - sourceWidth) / 2;
  } else {
    sourceHeight = video.videoWidth / canvasRatio;
    sourceY = (video.videoHeight - sourceHeight) / 2;
  }

  context.drawImage(
    video,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    thumbnailWidth,
    thumbnailHeight,
  );
}

export async function generateThumbnails({
  count,
  duration,
  signal,
  sourceUrl,
  onThumbnail,
}: GenerateThumbnailOptions): Promise<void> {
  const video = document.createElement('video');
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { alpha: false });

  if (!context) {
    throw new Error('Canvas is unavailable in this browser');
  }

  canvas.width = thumbnailWidth;
  canvas.height = thumbnailHeight;
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.src = sourceUrl;

  try {
    video.load();
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      await waitForVideoEvent(video, 'loadeddata', signal);
    }

    for (const time of getThumbnailTimes(duration, count)) {
      if (signal.aborted) {
        throw abortError();
      }

      const safeTime = Math.min(
        Math.max(0, time),
        Math.max(0, duration - 0.001),
      );
      video.currentTime = safeTime;
      await waitForVideoEvent(video, 'seeked', signal);
      drawCoverFrame(context, video);

      const blob = await canvasToBlob(canvas, signal);
      onThumbnail({ time, url: URL.createObjectURL(blob) });
    }
  } finally {
    video.removeAttribute('src');
    video.load();
  }
}
