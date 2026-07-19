# Video Trimmer Project Context

Read and follow [`AGENTS.md`](./AGENTS.md) before making changes.

## Goal

Create a fast, lightweight web app for selecting and exporting one continuous
segment from a local video. The app must be private by design: files are never
uploaded and no backend is involved.

## Agreed Stack

- Vanilla TypeScript
- Semantic HTML
- Modern CSS
- Vite
- Browser media APIs
- Focused JavaScript muxing/demuxing libraries only where browsers lack native
  container support

## Non-Negotiable Constraints

- No React for the current one-screen scope.
- No FFmpeg or FFmpeg.wasm.
- No MediaRecorder.
- No server-side media processing.
- No hidden upload, telemetry, or remote processing of user videos.

## Planned Processing Strategy

The initial export path is lossless MP4 remuxing:

1. Read and inspect the local file.
2. Find the nearest valid video keyframe at or before the requested start.
3. Copy compatible encoded audio and video samples in the selected interval.
4. Rebase all tracks against a shared timeline origin.
5. Preserve orientation and codec configuration metadata.
6. Recalculate output durations.
7. Produce a local downloadable `Blob`.

MP4Box is the intended starting point for MP4/MOV parsing and muxing. WebM/MKV
support may follow using Mediabunny or a focused muxer. A later precise mode may
use WebCodecs for decode/encode, but it is not required for the first release.

## Planned Interface

- Local file drop zone and picker
- Video preview
- Responsive thumbnail strip
- Dual-handle trim slider
- Current playback playhead
- Start and end time fields
- Selected duration
- Play-selection control
- Keyframe-alignment notice
- Export progress and cancellation
- Output preview and download

Thumbnails are captured from a hidden video element into Canvas at evenly spaced
times. Generate them sequentially, incrementally, and at low resolution.

## Product Language

- Say “processed in your browser” and “your video never leaves this device.”
- Call the default operation “Fast lossless trim.”
- Explain that its start may align to a nearby earlier keyframe.
- Reserve “Precise trim” for an actual frame-accurate re-encoding path.
- Never imply that browser or codec support is universal.

## Definition of Done for the MVP

- A supported MP4 can be loaded, previewed, and represented by thumbnails.
- The trim range works with pointer, touch, keyboard, and time inputs.
- Selected-range playback stops at the chosen end.
- Export preserves quality, audio synchronization, orientation, and valid timing.
- The output can be previewed and downloaded locally.
- Unsupported files and constrained devices receive actionable errors.
- Processing can be cancelled and all temporary resources are cleaned up.
- Core logic and the primary browser workflow have automated tests.
