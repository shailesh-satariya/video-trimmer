import {
  BoxParser,
  createFile,
  type IsoFileOptions,
  type Movie,
  type MP4BoxBuffer,
  type Sample,
  type SampleEntryFourCC,
  type Track,
} from 'mp4box';

import { getEditListTiming } from '../lib/mp4-edit-list';
import {
  mediaTimeToMovieTime,
  movieTimeToMediaTime,
} from '../lib/mp4-timeline';
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
  postMessage: (message: TrimWorkerResponse, transfer?: Transferable[]) => void;
};

type TrackPlan = {
  selectedSamples: Sample[];
  track: Track;
  visibleStartMediaSec: number;
};

type OutputTrackPlan = {
  outputId: number;
  plan: TrackPlan;
  sampleDataOffsets: number[];
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

  const videoVisibleStartMediaSec = movieTimeToMediaTime(videoTrack, startSec);
  const videoEndMediaSec = movieTimeToMediaTime(videoTrack, endSec);
  const requestedStartTick = Math.floor(
    videoVisibleStartMediaSec * videoTrack.timescale,
  );
  const videoStartIndex = findKeyframeIndex(videoSamples, requestedStartTick);
  const firstVideoSample = videoSamples[videoStartIndex];
  if (!firstVideoSample) {
    throw new Error('A valid video keyframe could not be found.');
  }

  const decodeStartMediaSec = firstVideoSample.cts / videoTrack.timescale;
  const decodeStartMovieSec = mediaTimeToMovieTime(
    videoTrack,
    decodeStartMediaSec,
  );
  const selectedVideoSamples = videoSamples
    .slice(videoStartIndex)
    .filter((sample) => sample.cts / videoTrack.timescale < videoEndMediaSec);

  if (selectedVideoSamples.length === 0) {
    throw new Error('No video samples were found in the selected range.');
  }

  const plans: TrackPlan[] = [
    {
      selectedSamples: selectedVideoSamples,
      track: videoTrack,
      visibleStartMediaSec: videoVisibleStartMediaSec,
    },
  ];
  const audioTrack = info.audioTracks[0];

  if (audioTrack) {
    const audioSamples = sourceFile.getTrackSamplesInfo(audioTrack.id);
    const audioDecodeStartMediaSec = movieTimeToMediaTime(
      audioTrack,
      decodeStartMovieSec,
    );
    const audioVisibleStartMediaSec = movieTimeToMediaTime(
      audioTrack,
      startSec,
    );
    const audioEndMediaSec = movieTimeToMediaTime(audioTrack, endSec);
    const selectedAudioSamples = audioSamples.filter((sample) => {
      const presentationTime = sample.cts / audioTrack.timescale;
      return (
        presentationTime >= audioDecodeStartMediaSec &&
        presentationTime < audioEndMediaSec
      );
    });

    if (selectedAudioSamples.length > 0) {
      plans.push({
        selectedSamples: selectedAudioSamples,
        track: audioTrack,
        visibleStartMediaSec: audioVisibleStartMediaSec,
      });
    }
  }

  return { plans };
}

function getDescriptionBoxes(
  sourceFile: ReturnType<typeof createFile>,
  trackId: number,
): IsoFileOptions['description_boxes'] {
  const sourceTrack = sourceFile.getTrackById(trackId);
  const sampleEntry = sourceTrack?.mdia?.minf?.stbl?.stsd?.entries?.[0] as
    { boxes?: IsoFileOptions['description_boxes'] } | undefined;
  return sampleEntry?.boxes ? [...sampleEntry.boxes] : [];
}

function buildTrackOptions(
  sourceFile: ReturnType<typeof createFile>,
  plan: TrackPlan,
  movieDuration: number,
): IsoFileOptions {
  const { selectedSamples, track } = plan;
  const codecFourCC = track.codec.slice(0, 4) as SampleEntryFourCC;
  const mediaDuration = selectedSamples.reduce(
    (duration, sample) => duration + sample.duration,
    0,
  );

  const options: IsoFileOptions = {
    description_boxes: getDescriptionBoxes(sourceFile, track.id),
    duration: movieDuration,
    height: track.video?.height,
    language: track.language,
    media_duration: mediaDuration,
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

function getRuns(values: number[]): {
  counts: number[];
  values: number[];
} {
  const counts: number[] = [];
  const runValues: number[] = [];

  for (const value of values) {
    const lastIndex = runValues.length - 1;

    if (lastIndex >= 0 && runValues[lastIndex] === value) {
      counts[lastIndex] = (counts[lastIndex] ?? 0) + 1;
    } else {
      runValues.push(value);
      counts.push(1);
    }
  }

  return { counts, values: runValues };
}

function configureProgressiveSampleTable(
  outputFile: ReturnType<typeof createFile>,
  outputTrackPlan: OutputTrackPlan,
): void {
  const { outputId, plan, sampleDataOffsets } = outputTrackPlan;
  const outputTrack = outputFile.getTrackById(outputId);
  const sampleTable = outputTrack?.mdia?.minf?.stbl;

  if (!sampleTable) {
    throw new Error('The output sample table could not be created.');
  }

  const durationRuns = getRuns(
    plan.selectedSamples.map((sample) => sample.duration),
  );
  sampleTable.stts.sample_counts = durationRuns.counts;
  sampleTable.stts.sample_deltas = durationRuns.values;

  const compositionOffsets = plan.selectedSamples.map(
    (sample) => sample.cts - sample.dts,
  );
  if (compositionOffsets.some((offset) => offset !== 0)) {
    const compositionRuns = getRuns(compositionOffsets);
    const compositionTimeBox = sampleTable.addBox(new BoxParser.box.ctts());
    compositionTimeBox.sample_counts = compositionRuns.counts;
    compositionTimeBox.sample_offsets = compositionRuns.values;
  }

  const syncSampleNumbers = plan.selectedSamples.flatMap((sample, index) =>
    sample.is_sync ? [index + 1] : [],
  );
  if (
    syncSampleNumbers.length > 0 &&
    syncSampleNumbers.length < plan.selectedSamples.length
  ) {
    const syncSampleBox = sampleTable.addBox(new BoxParser.box.stss());
    syncSampleBox.sample_numbers = syncSampleNumbers;
  }

  sampleTable.stsz.sample_size = 0;
  sampleTable.stsz.sample_sizes = plan.selectedSamples.map(
    (sample) => sample.size,
  );
  sampleTable.stco.chunk_offsets = [...sampleDataOffsets];
  sampleTable.stsc.first_chunk = [];
  sampleTable.stsc.samples_per_chunk = [];
  sampleTable.stsc.sample_description_index = [];

  let previousDescriptionIndex = -1;
  plan.selectedSamples.forEach((sample, index) => {
    const descriptionIndex = sample.description_index + 1;

    if (descriptionIndex !== previousDescriptionIndex) {
      sampleTable.stsc.first_chunk.push(index + 1);
      sampleTable.stsc.samples_per_chunk.push(1);
      sampleTable.stsc.sample_description_index.push(descriptionIndex);
      previousDescriptionIndex = descriptionIndex;
    }
  });
}

async function remuxMp4(
  sourceBuffer: MP4BoxBuffer,
  sourceFile: ReturnType<typeof createFile>,
  plans: TrackPlan[],
  movieTimescale: number,
  requestedStartSec: number,
  requestedEndSec: number,
): Promise<{
  actualEndSec: number;
  buffer: ArrayBuffer;
  duration: number;
}> {
  const outputFile = createFile();
  const visibleDuration = requestedEndSec - requestedStartSec;
  const movieDuration = Math.round(visibleDuration * movieTimescale);
  outputFile.init({
    duration: movieDuration,
    timescale: movieTimescale,
  });
  const outputTracks: OutputTrackPlan[] = [];
  for (const plan of plans) {
    const outputId = outputFile.addTrack(
      buildTrackOptions(sourceFile, plan, movieDuration),
    );
    if (outputId == null) {
      throw new Error(
        `The ${plan.track.type ?? 'media'} track could not be copied.`,
      );
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

    const outputTrack = outputFile.getTrackById(outputId);
    if (!outputTrack) {
      throw new Error('The output track timeline could not be created.');
    }

    const editBox = outputTrack.addBox(new BoxParser.box.edts());
    const editList = editBox.addBox(new BoxParser.box.elst());
    const firstSample = plan.selectedSamples[0];
    if (!firstSample) {
      throw new Error('The output track does not contain any samples.');
    }
    const editTiming = getEditListTiming(
      visibleDuration,
      plan.visibleStartMediaSec,
      firstSample.dts / plan.track.timescale,
      movieTimescale,
      plan.track.timescale,
    );
    editList.entries = [
      {
        media_time: editTiming.mediaTime,
        media_rate_fraction: 0,
        media_rate_integer: 1,
        segment_duration: editTiming.segmentDuration,
      },
    ];

    outputTracks.push({ outputId, plan, sampleDataOffsets: [] });
  }

  const totalSamples = outputTracks.reduce(
    (total, outputTrack) => total + outputTrack.plan.selectedSamples.length,
    0,
  );
  const totalMediaSize = outputTracks.reduce(
    (total, outputTrack) =>
      total +
      outputTrack.plan.selectedSamples.reduce(
        (trackTotal, sample) => trackTotal + sample.size,
        0,
      ),
    0,
  );
  const mediaData = new Uint8Array(totalMediaSize);
  let samplesCopied = 0;
  let mediaDataOffset = 0;

  for (const outputTrack of outputTracks) {
    const { plan, sampleDataOffsets } = outputTrack;
    for (const sample of plan.selectedSamples) {
      const sampleData = new Uint8Array(
        sourceBuffer,
        sample.offset,
        sample.size,
      );
      sampleDataOffsets.push(mediaDataOffset);
      mediaData.set(sampleData, mediaDataOffset);
      mediaDataOffset += sample.size;

      samplesCopied += 1;

      if (samplesCopied % 250 === 0) {
        postProgress('copying', 0.2 + (samplesCopied / totalSamples) * 0.7);
        await yieldToWorker();
      }
    }

    configureProgressiveSampleTable(outputFile, outputTrack);
  }

  postProgress('finalizing', 0.94);
  const movieBox = outputFile.moov;
  movieBox.boxes = (movieBox.boxes ?? []).filter((box) => box?.type !== 'mvex');
  delete movieBox.mvex;
  movieBox.mvexs = [];

  const mediaBox = outputFile.addBox(new BoxParser.box.mdat());
  mediaBox.data = new Uint8Array();
  const mediaPayloadStart = outputFile.getBuffer().buffer.byteLength;

  for (const { outputId, sampleDataOffsets } of outputTracks) {
    const chunkOffsets =
      outputFile.getTrackById(outputId)?.mdia?.minf?.stbl?.stco?.chunk_offsets;

    if (!chunkOffsets) {
      throw new Error('The output chunk offsets could not be finalized.');
    }

    chunkOffsets.splice(
      0,
      chunkOffsets.length,
      ...sampleDataOffsets.map((offset) => mediaPayloadStart + offset),
    );
  }

  mediaBox.data = mediaData;
  const stream = outputFile.getBuffer();
  const outputBuffer = stream.buffer;
  if (outputBuffer.byteLength === 0) {
    throw new Error('MP4Box did not produce an output file.');
  }

  return {
    actualEndSec: requestedEndSec,
    buffer: outputBuffer,
    duration: visibleDuration,
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

  const { plans } = createTrackPlans(info, sourceFile, startSec, safeEndSec);
  postProgress('copying', 0.2);
  const output = await remuxMp4(
    sourceBuffer,
    sourceFile,
    plans,
    info.timescale,
    startSec,
    safeEndSec,
  );

  const complete: TrimWorkerComplete = {
    type: 'complete',
    actualEndSec: output.actualEndSec,
    actualStartSec: startSec,
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
