import type {
  TrimProgressPhase,
  TrimWorkerRequest,
  TrimWorkerResponse,
} from './mp4-trim-protocol';

export type TrimProgress = {
  phase: TrimProgressPhase;
  progress: number;
};

export type TrimmedVideo = {
  actualEndSec: number;
  actualStartSec: number;
  blob: Blob;
  duration: number;
  filename: string;
};

export type TrimTask = {
  cancel: () => void;
  result: Promise<TrimmedVideo>;
};

export function getTrimmedFilename(filename: string): string {
  const extensionIndex = filename.lastIndexOf('.');
  const basename =
    extensionIndex > 0
      ? filename.slice(0, extensionIndex)
      : extensionIndex === 0
        ? ''
        : filename;
  return `${basename || 'video'}-trimmed.mp4`;
}

export function getFilenameStem(filename: string): string {
  return filename.replace(/\.mp4$/i, '');
}

export function normalizeDownloadFilename(value: string): string {
  const withoutExtension = value.trim().replace(/(?:\.mp4)+$/i, '');
  const sanitized = withoutExtension
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/[.\s-]+$/g, '')
    .trim();

  return `${sanitized || 'video-trimmed'}.mp4`;
}

export function getAlignmentNotice(
  requestedStartSec: number,
  actualStartSec: number,
): string | undefined {
  const difference = requestedStartSec - actualStartSec;
  if (difference < 0.001) {
    return undefined;
  }

  return `For a lossless result, the exported video begins ${difference.toFixed(3)} seconds earlier at the nearest keyframe.`;
}

export function startLosslessMp4Trim(
  file: File,
  startSec: number,
  endSec: number,
  onProgress: (progress: TrimProgress) => void,
): TrimTask {
  const worker = new Worker(
    new URL('../workers/mp4-trim.worker.ts', import.meta.url),
    {
      name: 'clipwell-mp4-trimmer',
      type: 'module',
    },
  );

  let settled = false;
  let rejectTask: ((reason: unknown) => void) | undefined;

  const result = new Promise<TrimmedVideo>((resolve, reject) => {
    rejectTask = reject;

    worker.addEventListener('message', (event: MessageEvent<TrimWorkerResponse>) => {
      const message = event.data;

      if (message.type === 'progress') {
        onProgress({
          phase: message.phase,
          progress: message.progress,
        });
        return;
      }

      settled = true;
      worker.terminate();

      if (message.type === 'error') {
        reject(new Error(message.message));
        return;
      }

      resolve({
        actualEndSec: message.actualEndSec,
        actualStartSec: message.actualStartSec,
        blob: new Blob([message.buffer], { type: 'video/mp4' }),
        duration: message.duration,
        filename: getTrimmedFilename(file.name),
      });
    });

    worker.addEventListener('error', (event) => {
      if (settled) {
        return;
      }

      settled = true;
      worker.terminate();
      reject(new Error(event.message || 'The trimming worker stopped unexpectedly.'));
    });

    const request: TrimWorkerRequest = {
      type: 'trim',
      endSec,
      file,
      startSec,
    };
    worker.postMessage(request);
  });

  return {
    result,
    cancel: () => {
      if (settled) {
        return;
      }

      settled = true;
      worker.terminate();
      rejectTask?.(
        new DOMException('Video trimming was cancelled', 'AbortError'),
      );
    },
  };
}
