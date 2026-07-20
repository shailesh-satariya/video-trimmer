import {
  createFile,
  type IsoFileOptions,
  type Movie,
  type MP4BoxBuffer,
  type Sample,
  type SampleEntryFourCC,
  type Track,
} from 'mp4box';

import type {
  TrimWorkerComplete,
  TrimWorkerRequest,
  TrimWorkerResponse,
} from '../lib/mp4-trim-protocol';

type WorkerScope = {
  addEventListener: (
    type: 'message',
    listener: (event: MessageEvent<TrimWorkerRequest>) => void,
  ) => void;
  postMessage: (
    message: TrimWorkerResponse,
    transfer?: Transferable[],
  ) => void;
};

type TrackPlan = {
  selectedSamples: Sample[];
  track: Track;
};

const workerScope = self as unknown as WorkerScope;

function postProgress(
  phase: 'reading' | 'parsing' | 'copying' | 'finalizing',
  progress: number,
): void {
  workerScope.postMessage({
    type: 'progress',
    phase,
    progress: Math.min(1, Math.max(0, progress)),
  });
}

function yieldToWorker(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

function parseMp4(buffer: ArrayBuffer): Promise<{
  info: Movie;
  sourceBuffer: MP4BoxBuffer;
  sourceFile: ReturnType<typeof createFile>;
}> {
  const sourceFile = createFile();
  const sourceBuffer = buffer as MP4BoxBuffer;
  sourceBuffer.fileStart = 0;

  return new Promise((resolve, reject) => {
    sourceFile.onError = (_module, message) => {
      reject(new Error(`MP4 parsing failed: ${message}`));
    };
    sourceFile.onReady = (info) => {
      resolve({ info, sourceBuffer, sourceFile });
    };

    sourceFile.appendBuffer(sourceBuffer, true);
    sourceFile.flush();
  });
}

function findKeyframeIndex(
  samples: Sample[],
  requestedStartTick: number,
): number {
  let keyframeIndex = -1;

  for (let index = 0; index < samples.length; index += 1) {
    const sample = samples[index];
    if (!sample) {
      continue;
    }

    if (sample.cts > requestedStartTick) {
      break;
    }

    if (sample.is_sync) {
      keyframeIndex = index;
    }
  }

  if (keyframeIndex >= 0) {
    return keyframeIndex;
  }

  const firstSyncIndex = samples.findIndex((sample) => sample.is_sync);
  return firstSyncIndex >= 0 ? firstSyncIndex : 0;
}

function createTrackPlans(
  info: Movie,
  sourceFile: ReturnType<typeof createFile>,
  startSec: number,
  endSec: number,
): {
  actualStartSec: number;
  plans: TrackPlan[];
} {
  const videoTrack = info.videoTracks[0];
  if (!videoTrack) {
    throw new Error('The MP4 does not contain a video track.');
  }

  const videoSamples = sourceFile.getTrackSamplesInfo(videoTrack.id);
  if (videoSamples.length === 0) {
    throw new Error('The video track does not contain any samples.');
  }

  const requestedStartTick = Math.floor(startSec * videoTrack.timescale);
  const videoStartIndex = findKeyframeIndex(
    videoSamples,
    requestedStartTick,
  );
  const firstVideoSample = videoSamples[videoStartIndex];
  if (!firstVideoSample) {
    throw new Error('A valid video keyframe could not be found.');
  }

  const actualStartSec = firstVideoSample.cts / videoTrack.timescale;
  const selectedVideoSamples = videoSamples
    .slice(videoStartIndex)
    .filter((sample) => sample.cts / videoTrack.timescale < endSec);

  if (selectedVideoSamples.length === 0) {
    throw new Error('No video samples were found in the selected range.');
  }

  const plans: TrackPlan[] = [
    { selectedSamples: selectedVideoSamples, track: videoTrack },
  ];
  const audioTrack = info.audioTracks[0];

  if (audioTrack) {
    const audioSamples = sourceFile.getTrackSamplesInfo(audioTrack.id);
    const selectedAudioSamples = audioSamples.filter((sample) => {
      const presentationTime = sample.cts / audioTrack.timescale;
      return presentationTime >= actualStartSec && presentationTime < endSec;
    });

    if (selectedAudioSamples.length > 0) {
      plans.push({
        selectedSamples: selectedAudioSamples,
        track: audioTrack,
      });
    }
  }

  return { actualStartSec, plans };
}

function getDescriptionBoxes(
  sourceFile: ReturnType<typeof createFile>,
  trackId: number,
): IsoFileOptions['description_boxes'] {
  const sourceTrack = sourceFile.getTrackById(trackId);
  const sampleEntry = sourceTrack?.mdia?.minf?.stbl?.stsd?.entries?.[0] as
    | { boxes?: IsoFileOptions['description_boxes'] }
    | undefined;
  return sampleEntry?.boxes ? [...sampleEntry.boxes] : [];
}

function getTimelineOrigin(plans: TrackPlan[]): number {
  let earliestDecodeTime = Number.POSITIVE_INFINITY;

  for (const plan of plans) {
    const firstSample = plan.selectedSamples[0];
    if (firstSample) {
      earliestDecodeTime = Math.min(
        earliestDecodeTime,
        firstSample.dts / plan.track.timescale,
      );
    }
  }

  if (!Number.isFinite(earliestDecodeTime)) {
    throw new Error('The selected tracks do not contain media samples.');
  }

  return earliestDecodeTime;
}

function buildTrackOptions(
  sourceFile: ReturnType<typeof createFile>,
  plan: TrackPlan,
  timelineOrigin: number,
): IsoFileOptions {
  const { selectedSamples, track } = plan;
  const codecFourCC = track.codec.slice(0, 4) as SampleEntryFourCC;
  const outputEndTick = Math.max(
    ...selectedSamples.map(
      (sample) =>
        sample.cts +
        sample.duration -
        Math.round(timelineOrigin * track.timescale),
    ),
  );

  const options: IsoFileOptions = {
    description_boxes: getDescriptionBoxes(sourceFile, track.id),
    duration: Math.max(0, outputEndTick),
    height: track.video?.height,
    language: track.language,
    media_duration: Math.max(0, outputEndTick),
    name: track.name,
    timescale: track.timescale,
    type: codecFourCC,
    width: track.video?.width,
  };

  if (track.audio) {
    options.channel_count = track.audio.channel_count;
    options.samplerate = track.audio.sample_rate;
    options.samplesize = track.audio.sample_size;
  }

  return options;
}

async function remuxMp4(
  sourceBuffer: MP4BoxBuffer,
  sourceFile: ReturnType<typeof createFile>,
  plans: TrackPlan[],
  timelineOrigin: number,
): Promise<{
  actualEndSec: number;
  buffer: ArrayBuffer;
  duration: number;
}> {
  const outputFile = createFile();
  const outputTracks: Array<{
    outputId: number;
    plan: TrackPlan;
  }> = [];
  let outputDuration = 0;
  let actualEndSec = 0;

  for (const plan of plans) {
    const outputId = outputFile.addTrack(
      buildTrackOptions(sourceFile, plan, timelineOrigin),
    );
    if (outputId == null) {
      throw new Error(`The ${plan.track.type ?? 'media'} track could not be copied.`);
    }

    if (plan.track.type === 'video') {
      const sourceTrack = sourceFile.getTrackById(plan.track.id);
      const outputTrack = outputFile.getTrackById(outputId);
      const sourceHeader = sourceTrack?.tkhd;
      const outputHeader = outputTrack?.tkhd;

      if (sourceHeader && outputHeader) {
        if (sourceHeader.matrix?.length === 9) {
          outputHeader.matrix = new Int32Array(sourceHeader.matrix);
        }
        outputHeader.width = sourceHeader.width;
        outputHeader.height = sourceHeader.height;
      }
    }

    outputTracks.push({ outputId, plan });
  }

  const totalSamples = outputTracks.reduce(
    (total, outputTrack) =>
      total + outputTrack.plan.selectedSamples.length,
    0,
  );
  let samplesCopied = 0;

  for (const { outputId, plan } of outputTracks) {
    const originTick = Math.round(timelineOrigin * plan.track.timescale);

    for (const sample of plan.selectedSamples) {
      const sampleData = new Uint8Array(
        sourceBuffer,
        sample.offset,
        sample.size,
      );
      const cts = Math.max(0, sample.cts - originTick);
      const dts = Math.max(0, sample.dts - originTick);

      outputFile.addSample(outputId, sampleData, {
        cts,
        degradation_priority: sample.degradation_priority,
        depends_on: sample.depends_on,
        dts,
        duration: sample.duration,
        has_redundancy: sample.has_redundancy,
        is_depended_on: sample.is_depended_on,
        is_leading: sample.is_leading,
        is_sync: sample.is_sync,
        sample_description_index: sample.description_index,
        subsamples: sample.subsamples,
      });

      const presentationEnd =
        (sample.cts + sample.duration) / plan.track.timescale;
      actualEndSec = Math.max(actualEndSec, presentationEnd);
      outputDuration = Math.max(
        outputDuration,
        (sample.cts + sample.duration - originTick) / plan.track.timescale,
      );
      samplesCopied += 1;

      if (samplesCopied % 250 === 0) {
        postProgress(
          'copying',
          0.2 + (samplesCopied / totalSamples) * 0.7,
        );
        await yieldToWorker();
      }
    }
  }

  postProgress('finalizing', 0.94);
  const stream = outputFile.getBuffer();
  const outputBuffer = stream._buffer;
  if (!outputBuffer || outputBuffer.byteLength === 0) {
    throw new Error('MP4Box did not produce an output file.');
  }

  return {
    actualEndSec,
    buffer: outputBuffer,
    duration: outputDuration,
  };
}

async function trimMp4(request: TrimWorkerRequest): Promise<void> {
  const { endSec, file, startSec } = request;

  if (startSec < 0 || endSec <= startSec) {
    throw new Error('Choose a trim end that is later than the start.');
  }

  if (file.size === 0) {
    throw new Error('The selected file is empty.');
  }

  postProgress('reading', 0.03);
  const inputBuffer = await file.arrayBuffer();
  postProgress('parsing', 0.1);
  const { info, sourceBuffer, sourceFile } = await parseMp4(inputBuffer);
  const fileDuration = info.duration / info.timescale;
  const safeEndSec = Math.min(endSec, fileDuration);

  if (safeEndSec <= startSec) {
    throw new Error('The trim range falls outside the video duration.');
  }

  const { actualStartSec, plans } = createTrackPlans(
    info,
    sourceFile,
    startSec,
    safeEndSec,
  );
  postProgress('copying', 0.2);
  const output = await remuxMp4(
    sourceBuffer,
    sourceFile,
    plans,
    getTimelineOrigin(plans),
  );

  const complete: TrimWorkerComplete = {
    type: 'complete',
    actualEndSec: output.actualEndSec,
    actualStartSec,
    buffer: output.buffer,
    duration: output.duration,
  };
  postProgress('finalizing', 1);
  workerScope.postMessage(complete, [output.buffer]);
}

workerScope.addEventListener('message', (event) => {
  void trimMp4(event.data).catch((error: unknown) => {
    workerScope.postMessage({
      type: 'error',
      message:
        error instanceof Error
          ? error.message
          : `Video trimming failed: ${String(error)}`,
    });
  });
});

