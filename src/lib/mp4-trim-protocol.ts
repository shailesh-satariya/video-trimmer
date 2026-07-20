export type TrimProgressPhase =
  'reading' | 'parsing' | 'copying' | 'finalizing';

export type TrimWorkerRequest = {
  type: 'trim';
  file: File;
  startSec: number;
  endSec: number;
};

export type TrimWorkerProgress = {
  type: 'progress';
  phase: TrimProgressPhase;
  progress: number;
};

export type TrimWorkerComplete = {
  type: 'complete';
  actualEndSec: number;
  actualStartSec: number;
  buffer: ArrayBuffer;
  duration: number;
};

export type TrimWorkerError = {
  type: 'error';
  message: string;
};

export type TrimWorkerResponse =
  TrimWorkerProgress | TrimWorkerComplete | TrimWorkerError;
