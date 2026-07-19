# Video Trimmer — Agent Instructions

## Product

Build a lightweight, privacy-first video trimming web app. All media stays on
the user's device and all processing runs in the browser.

## Technical Direction

- Use vanilla TypeScript, HTML, and CSS with Vite.
- Do not use React unless the project scope changes enough to justify it.
- Do not use FFmpeg, FFmpeg.wasm, MediaRecorder, or server-side processing.
- Use native browser APIs such as `<video>`, Canvas, WebCodecs, Web Audio,
  File, Blob, object URLs, and Web Workers.
- Small JavaScript demuxing/muxing libraries are allowed. Prefer MP4Box for
  MP4/MOV and evaluate Mediabunny or a focused WebM muxer for WebM/MKV.
- Keep lossless, keyframe-aligned remuxing as the first export mode.
- Treat frame-accurate WebCodecs re-encoding as a later, optional mode.
- Keep media parsing and remuxing off the main thread where practical.

## MVP Requirements

- Import one local video by file picker or drag and drop.
- Preview the video without uploading it.
- Display basic file metadata and duration.
- Generate a responsive strip of low-resolution thumbnails using a hidden
  video element and Canvas.
- Provide an accessible dual-handle trim slider with start and end tooltips.
- Display a playback playhead over the thumbnail timeline.
- Allow precise start and end time entry.
- Preview only the selected range.
- Export a lossless trimmed MP4 when the source is compatible.
- Clearly show when the exported start is moved to an earlier keyframe.
- Provide progress, cancellation, result preview, and download.

## Timeline Behavior

- Start must remain less than end; handles must not cross.
- Support pointer, touch, and keyboard interaction.
- Arrow keys adjust a handle; provide a modifier for fine adjustment.
- Timeline clicks seek the preview.
- Slider movement must not regenerate thumbnails.
- Update drag visuals through `requestAnimationFrame()` when useful.

## Thumbnail Behavior

- Generate thumbnails incrementally and cancel stale work when the file changes.
- Derive the thumbnail count from the rendered timeline width, with a sensible
  cap (roughly 8–16 for typical desktop layouts).
- Use small frames around 160×90 while preserving source aspect ratio.
- Cache thumbnails for the active file and revoke all object URLs on cleanup.
- Generate thumbnails sequentially to avoid seek races.

## Media Correctness

- Preserve video orientation and codec configuration metadata.
- Use a shared output timeline origin for audio and video to avoid sync drift.
- Preserve composition-time relationships while keeping output timestamps valid.
- Recalculate movie and track durations for the trimmed output.
- Validate empty files, unsupported containers/codecs, invalid ranges, missing
  tracks, and memory-intensive inputs.
- Do not describe a keyframe-aligned result as frame-accurate.

## Engineering Standards

- Favor small modules with explicit responsibilities.
- Keep UI state separate from media-processing code.
- Use strict TypeScript and avoid `any` unless an external library forces it.
- Clean up workers, encoders, decoders, canvases, and object URLs on every path.
- Maintain visible focus styles, semantic labels, sufficient contrast, and
  reduced-motion support.
- Add unit tests for time conversion, range constraints, keyframe selection,
  timestamp rebasing, and filename generation.
- Add browser tests for import, thumbnail generation, slider interaction,
  selected-range playback, cancellation, export, and download.
- Test rotated video, variable frame rate, silent video, audio/video offsets,
  odd dimensions, short clips, and large inputs.

## Change Discipline

- Keep the app focused on trimming; avoid unrelated editing features.
- Do not add dependencies when a small, reliable browser-native implementation
  is clearer.
- Explain compatibility trade-offs in the UI instead of silently degrading.
- Preserve existing user changes and keep commits narrowly scoped.
