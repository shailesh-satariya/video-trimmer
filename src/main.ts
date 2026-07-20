import { formatTime } from './lib/time';
import {
  formatBytes,
  getVideoFormat,
  getVideoSizeNotice,
  validateVideoFile,
} from './lib/video-file';
import {
  getRangePercentages,
  updateTrimRange,
  type TrimHandle,
  type TrimRange,
} from './lib/trim-range';
import {
  generateThumbnails,
  getThumbnailCount,
  type GeneratedThumbnail,
} from './lib/thumbnails';
import {
  getAlignmentNotice,
  getFilenameStem,
  normalizeDownloadFilename,
  startLosslessMp4Trim,
  type TrimProgress,
  type TrimTask,
} from './lib/mp4-trimmer';
import './styles.css';

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('Application root was not found');
}

app.innerHTML = `
  <div class="page-shell">
    <header class="site-header">
      <a class="brand" href="/" aria-label="Clipwell home">
        <span class="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" role="img">
            <path d="M7 4.5v15l12-7.5L7 4.5Z" />
          </svg>
        </span>
        <span>Clipwell</span>
      </a>

      <div class="privacy-note">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3 5.5 5.8v5.3c0 4.2 2.7 8 6.5 9.4 3.8-1.4 6.5-5.2 6.5-9.4V5.8L12 3Z" />
          <path d="m9.3 11.8 1.7 1.7 3.8-4" />
        </svg>
        <span>Private by design</span>
      </div>
    </header>

    <main>
      <section class="hero" aria-labelledby="hero-title">
        <p class="eyebrow">Fast. Focused. Fully local.</p>
        <h1 id="hero-title">Cut the moment.<br /><em>Keep the quality.</em></h1>
        <p class="hero-copy">
          Trim videos in seconds without uploading a single frame.
          Everything happens right here, on your device.
        </p>
      </section>

      <section
        id="import-panel"
        class="workspace-card"
        aria-labelledby="import-title"
      >
        <div class="workspace-heading">
          <div>
            <span class="step-number">01</span>
            <div>
              <h2 id="import-title">Choose your video</h2>
              <p>Start with an MP4 or MOV file from your device.</p>
            </div>
          </div>
          <span class="local-pill">
            <span aria-hidden="true"></span>
            Local only
          </span>
        </div>

        <label id="drop-zone" class="drop-zone" for="video-input" tabindex="0">
          <input
            id="video-input"
            type="file"
            accept=".mp4,.mov,video/mp4,video/quicktime"
          />
          <span class="upload-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5" />
              <path d="M5 14.5V19h14v-4.5" />
            </svg>
          </span>
          <strong>Drop your video here</strong>
          <span>or <span class="browse-label">browse your files</span></span>
          <small>MP4 or MOV · processed entirely in your browser</small>
        </label>

        <p id="import-error" class="import-message import-message--error" role="alert" hidden></p>
      </section>

      <section
        id="preview-panel"
        class="workspace-card preview-card"
        aria-labelledby="preview-title"
        hidden
      >
        <div class="workspace-heading preview-heading">
          <div>
            <span class="step-number step-number--complete" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="m7 12.5 3.2 3.2L17.5 8" />
              </svg>
            </span>
            <div class="file-heading">
              <h2 id="preview-title">Video ready</h2>
              <p id="video-filename"></p>
            </div>
          </div>
          <div class="preview-actions">
            <button id="replace-video" class="button button--quiet" type="button">
              Replace
            </button>
            <button
              id="remove-video"
              class="icon-button"
              type="button"
              aria-label="Remove video"
              title="Remove video"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
        </div>

        <div class="preview-stage">
          <video id="video-preview" controls playsinline preload="metadata"></video>
          <div id="preview-loading" class="preview-loading" role="status">
            <span class="spinner" aria-hidden="true"></span>
            Reading video…
          </div>
        </div>

        <div class="video-details" aria-label="Video information">
          <div>
            <span>Duration</span>
            <strong id="video-duration">—</strong>
          </div>
          <div>
            <span>Resolution</span>
            <strong id="video-resolution">—</strong>
          </div>
          <div>
            <span>File size</span>
            <strong id="video-size">—</strong>
          </div>
          <div>
            <span>Format</span>
            <strong id="video-format">—</strong>
          </div>
        </div>

        <p id="preview-message" class="import-message" role="status" hidden></p>

        <section
          id="trim-section"
          class="trim-section"
          aria-labelledby="trim-title"
          hidden
        >
          <div class="trim-heading">
            <div>
              <span class="step-number">02</span>
              <div>
                <h2 id="trim-title">Choose the moment</h2>
                <p>Drag the handles or enter exact times.</p>
              </div>
            </div>
            <span id="thumbnail-status" class="thumbnail-status" role="status">
              Preparing frames…
            </span>
          </div>

          <div class="timeline-time-row" aria-hidden="true">
            <span>00:00.000</span>
            <span id="timeline-end-label">00:00.000</span>
          </div>

          <div
            id="timeline"
            class="timeline"
            aria-label="Video thumbnail timeline"
          >
            <div id="thumbnail-strip" class="thumbnail-strip" aria-hidden="true"></div>
            <div id="timeline-shade-before" class="timeline-shade timeline-shade--before"></div>
            <div id="timeline-shade-after" class="timeline-shade timeline-shade--after"></div>
            <div id="timeline-selection" class="timeline-selection"></div>
            <div id="timeline-playhead" class="timeline-playhead" aria-hidden="true"></div>
            <div id="start-tooltip" class="handle-tooltip handle-tooltip--start" aria-hidden="true">00:00.000</div>
            <div id="end-tooltip" class="handle-tooltip handle-tooltip--end" aria-hidden="true">00:00.000</div>
            <input
              id="trim-start-range"
              class="trim-range trim-range--start"
              type="range"
              min="0"
              max="1"
              value="0"
              step="0.001"
              aria-label="Trim start"
            />
            <input
              id="trim-end-range"
              class="trim-range trim-range--end"
              type="range"
              min="0"
              max="1"
              value="1"
              step="0.001"
              aria-label="Trim end"
            />
          </div>

          <div class="trim-controls">
            <label class="time-field">
              <span>Start</span>
              <span class="time-input-wrap">
                <input
                  id="trim-start-input"
                  type="number"
                  min="0"
                  value="0"
                  step="0.001"
                  inputmode="decimal"
                  aria-label="Trim start in seconds"
                />
                <small>sec</small>
              </span>
            </label>

            <div class="selection-duration">
              <span>Selected</span>
              <strong id="selection-duration">00:00.000</strong>
            </div>

            <label class="time-field">
              <span>End</span>
              <span class="time-input-wrap">
                <input
                  id="trim-end-input"
                  type="number"
                  min="0"
                  value="1"
                  step="0.001"
                  inputmode="decimal"
                  aria-label="Trim end in seconds"
                />
                <small>sec</small>
              </span>
            </label>

            <button id="play-selection" class="button button--play" type="button">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path class="play-icon" d="M8 5.5v13l10-6.5L8 5.5Z" />
                <path class="pause-icon" d="M8.5 6v12M15.5 6v12" />
              </svg>
              <span>Play selection</span>
            </button>
          </div>

          <div class="export-action">
            <div>
              <span class="export-mode">Fast lossless trim</span>
              <p>Original quality, with the start aligned to a nearby keyframe when needed.</p>
            </div>
            <button id="trim-video" class="button button--export" type="button">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 4.5v15l12-7.5L7 4.5Z" />
              </svg>
              Trim video
            </button>
          </div>

          <div id="export-progress" class="export-progress" aria-live="polite" hidden>
            <div class="export-progress-copy">
              <div>
                <span class="spinner spinner--small" aria-hidden="true"></span>
                <div>
                  <strong id="export-status">Preparing video…</strong>
                  <span>Your file remains on this device.</span>
                </div>
              </div>
              <button id="cancel-export" class="button button--quiet" type="button">
                Cancel
              </button>
            </div>
            <div
              class="progress-track"
              role="progressbar"
              aria-label="Video trimming progress"
              aria-valuemin="0"
              aria-valuemax="100"
              aria-valuenow="0"
            >
              <span id="progress-fill"></span>
            </div>
          </div>

          <p id="export-message" class="import-message" role="status" hidden></p>

          <section
            id="result-panel"
            class="result-panel"
            aria-labelledby="result-title"
            hidden
          >
            <div class="result-heading">
              <div>
                <span class="result-check" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="m7 12.5 3.2 3.2L17.5 8" />
                  </svg>
                </span>
                <div>
                  <span>Trim complete</span>
                  <h2 id="result-title">Your video is ready</h2>
                </div>
              </div>
              <button id="discard-result" class="button button--quiet" type="button">
                Adjust trim
              </button>
            </div>

            <video id="result-preview" controls playsinline preload="metadata"></video>

            <div class="result-summary">
              <div class="result-file">
                <span>Output</span>
                <strong id="result-filename"></strong>
              </div>
              <div>
                <span>Duration</span>
                <strong id="result-duration">—</strong>
              </div>
              <div>
                <span>Size</span>
                <strong id="result-size">—</strong>
              </div>
              <button id="download-result" class="button button--download" type="button">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 4v11m0 0 4-4m-4 4-4-4M5 19h14" />
                </svg>
                Download
              </button>
            </div>

            <p id="alignment-notice" class="alignment-notice" hidden></p>
          </section>
        </section>
      </section>

      <section id="trust-row" class="trust-row" aria-label="Product benefits">
        <article>
          <span class="benefit-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M12 3 5.5 5.8v5.3c0 4.2 2.7 8 6.5 9.4 3.8-1.4 6.5-5.2 6.5-9.4V5.8L12 3Z" />
              <path d="m9.3 11.8 1.7 1.7 3.8-4" />
            </svg>
          </span>
          <div>
            <h3>Your video stays yours</h3>
            <p>No uploads, no cloud, no tracking.</p>
          </div>
        </article>
        <article>
          <span class="benefit-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="m13.5 2.8-7 10h5l-1 8.4 7-10h-5l1-8.4Z" />
            </svg>
          </span>
          <div>
            <h3>Lossless and quick</h3>
            <p>Cut without re-encoding whenever possible.</p>
          </div>
        </article>
        <article>
          <span class="benefit-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="8.5" />
              <path d="M12 7v5l3 2" />
            </svg>
          </span>
          <div>
            <h3>Made for one job</h3>
            <p>No clutter. Just choose, trim, and save.</p>
          </div>
        </article>
      </section>
    </main>

    <footer>
      <span>Videos are processed locally and never leave your browser.</span>
      <span>Clipwell · Private video trimming</span>
    </footer>

    <dialog id="filename-dialog" class="filename-dialog" aria-labelledby="filename-dialog-title">
      <form id="filename-form">
        <div class="dialog-heading">
          <div>
            <span class="dialog-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M12 4v11m0 0 4-4m-4 4-4-4M5 19h14" />
              </svg>
            </span>
            <div>
              <span>Save locally</span>
              <h2 id="filename-dialog-title">Name your video</h2>
            </div>
          </div>
          <button
            id="close-filename-dialog"
            class="icon-button"
            type="button"
            aria-label="Close filename dialog"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <label class="filename-field">
          <span>File name</span>
          <span class="filename-input-wrap">
            <input
              id="download-filename"
              type="text"
              autocomplete="off"
              maxlength="180"
              aria-describedby="filename-help filename-error"
            />
            <small>.mp4</small>
          </span>
        </label>
        <p id="filename-help" class="filename-help">
          The file will be saved to your browser’s download location.
        </p>
        <p id="filename-error" class="filename-error" role="alert" hidden>
          Enter a file name.
        </p>

        <div class="dialog-actions">
          <button id="cancel-filename" class="button button--quiet" type="button">
            Cancel
          </button>
          <button class="button button--download" type="submit">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 4v11m0 0 4-4m-4 4-4-4M5 19h14" />
            </svg>
            Download file
          </button>
        </div>
      </form>
    </dialog>
  </div>
`;

function queryElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Required element was not found: ${selector}`);
  }
  return element;
}

const hero = queryElement<HTMLElement>('.hero');
const importPanel = queryElement<HTMLElement>('#import-panel');
const previewPanel = queryElement<HTMLElement>('#preview-panel');
const trustRow = queryElement<HTMLElement>('#trust-row');
const dropZone = queryElement<HTMLLabelElement>('#drop-zone');
const videoInput = queryElement<HTMLInputElement>('#video-input');
const importError = queryElement<HTMLParagraphElement>('#import-error');
const video = queryElement<HTMLVideoElement>('#video-preview');
const previewLoading = queryElement<HTMLElement>('#preview-loading');
const previewMessage = queryElement<HTMLParagraphElement>('#preview-message');
const filename = queryElement<HTMLElement>('#video-filename');
const duration = queryElement<HTMLElement>('#video-duration');
const resolution = queryElement<HTMLElement>('#video-resolution');
const size = queryElement<HTMLElement>('#video-size');
const format = queryElement<HTMLElement>('#video-format');
const replaceButton = queryElement<HTMLButtonElement>('#replace-video');
const removeButton = queryElement<HTMLButtonElement>('#remove-video');
const trimSection = queryElement<HTMLElement>('#trim-section');
const thumbnailStatus = queryElement<HTMLElement>('#thumbnail-status');
const thumbnailStrip = queryElement<HTMLElement>('#thumbnail-strip');
const timeline = queryElement<HTMLElement>('#timeline');
const timelineEndLabel = queryElement<HTMLElement>('#timeline-end-label');
const timelineSelection = queryElement<HTMLElement>('#timeline-selection');
const timelineShadeBefore = queryElement<HTMLElement>('#timeline-shade-before');
const timelineShadeAfter = queryElement<HTMLElement>('#timeline-shade-after');
const timelinePlayhead = queryElement<HTMLElement>('#timeline-playhead');
const startTooltip = queryElement<HTMLElement>('#start-tooltip');
const endTooltip = queryElement<HTMLElement>('#end-tooltip');
const startRange = queryElement<HTMLInputElement>('#trim-start-range');
const endRange = queryElement<HTMLInputElement>('#trim-end-range');
const startInput = queryElement<HTMLInputElement>('#trim-start-input');
const endInput = queryElement<HTMLInputElement>('#trim-end-input');
const selectionDuration = queryElement<HTMLElement>('#selection-duration');
const playSelectionButton =
  queryElement<HTMLButtonElement>('#play-selection');
const playSelectionLabel = queryElement<HTMLElement>('#play-selection span');
const trimVideoButton = queryElement<HTMLButtonElement>('#trim-video');
const exportProgress = queryElement<HTMLElement>('#export-progress');
const exportStatus = queryElement<HTMLElement>('#export-status');
const progressTrack = queryElement<HTMLElement>('.progress-track');
const progressFill = queryElement<HTMLElement>('#progress-fill');
const cancelExportButton =
  queryElement<HTMLButtonElement>('#cancel-export');
const exportMessage = queryElement<HTMLParagraphElement>('#export-message');
const resultPanel = queryElement<HTMLElement>('#result-panel');
const resultPreview = queryElement<HTMLVideoElement>('#result-preview');
const resultFilename = queryElement<HTMLElement>('#result-filename');
const resultDuration = queryElement<HTMLElement>('#result-duration');
const resultSize = queryElement<HTMLElement>('#result-size');
const downloadResult = queryElement<HTMLButtonElement>('#download-result');
const alignmentNotice = queryElement<HTMLParagraphElement>('#alignment-notice');
const discardResultButton =
  queryElement<HTMLButtonElement>('#discard-result');
const filenameDialog =
  queryElement<HTMLDialogElement>('#filename-dialog');
const filenameForm = queryElement<HTMLFormElement>('#filename-form');
const downloadFilename =
  queryElement<HTMLInputElement>('#download-filename');
const filenameError = queryElement<HTMLParagraphElement>('#filename-error');
const closeFilenameDialog =
  queryElement<HTMLButtonElement>('#close-filename-dialog');
const cancelFilenameButton =
  queryElement<HTMLButtonElement>('#cancel-filename');

let currentUrl: string | undefined;
let currentFile: File | undefined;
let dragDepth = 0;
let trimRange: TrimRange = { start: 0, end: 0 };
let thumbnailController: AbortController | undefined;
let thumbnailUrls: string[] = [];
let playingSelection = false;
let trimTask: TrimTask | undefined;
let resultUrl: string | undefined;
let resultDownloadFilename: string | undefined;

function showImportError(message: string): void {
  importError.textContent = message;
  importError.hidden = false;
}

function clearImportError(): void {
  importError.textContent = '';
  importError.hidden = true;
}

function stopSelectionPlayback(): void {
  playingSelection = false;
  playSelectionButton.classList.remove('is-playing');
  playSelectionLabel.textContent = 'Play selection';
}

function releaseResult(): void {
  if (filenameDialog.open) {
    filenameDialog.close();
  }
  resultPreview.pause();
  resultPreview.removeAttribute('src');
  resultPreview.load();

  if (resultUrl) {
    URL.revokeObjectURL(resultUrl);
    resultUrl = undefined;
  }

  resultPanel.hidden = true;
  resultDownloadFilename = undefined;
  downloadFilename.value = '';
  filenameError.hidden = true;
}

function setExportBusy(isBusy: boolean): void {
  const controls = [
    startRange,
    endRange,
    startInput,
    endInput,
    playSelectionButton,
    trimVideoButton,
    replaceButton,
    removeButton,
  ];

  for (const control of controls) {
    control.disabled = isBusy;
  }

  trimSection.setAttribute('aria-busy', String(isBusy));
  exportProgress.hidden = !isBusy;
  trimVideoButton.hidden = isBusy;
}

function cancelActiveTrim(): void {
  trimTask?.cancel();
  trimTask = undefined;
}

function resetExportInterface(): void {
  cancelActiveTrim();
  releaseResult();
  setExportBusy(false);
  exportMessage.hidden = true;
  exportMessage.textContent = '';
  progressFill.style.width = '0%';
  progressTrack.setAttribute('aria-valuenow', '0');
}

function clearThumbnails(): void {
  thumbnailController?.abort();
  thumbnailController = undefined;

  for (const url of thumbnailUrls) {
    URL.revokeObjectURL(url);
  }

  thumbnailUrls = [];
  thumbnailStrip.replaceChildren();
}

function resetTrimInterface(): void {
  stopSelectionPlayback();
  clearThumbnails();
  trimRange = { start: 0, end: 0 };
  trimSection.hidden = true;
  timelinePlayhead.style.left = '0%';
}

function releaseCurrentVideo(): void {
  resetExportInterface();
  resetTrimInterface();
  video.pause();
  video.removeAttribute('src');
  video.load();

  if (currentUrl) {
    URL.revokeObjectURL(currentUrl);
    currentUrl = undefined;
  }

  currentFile = undefined;
}

function renderTrimRange(): void {
  const mediaDuration = video.duration;
  const percentages = getRangePercentages(trimRange, mediaDuration);
  const startPercent = `${percentages.start}%`;
  const endPercent = `${percentages.end}%`;

  startRange.value = String(trimRange.start);
  endRange.value = String(trimRange.end);
  startInput.value = trimRange.start.toFixed(3);
  endInput.value = trimRange.end.toFixed(3);
  selectionDuration.textContent = formatTime(trimRange.end - trimRange.start);

  timelineSelection.style.left = startPercent;
  timelineSelection.style.width = `${percentages.end - percentages.start}%`;
  timelineShadeBefore.style.width = startPercent;
  timelineShadeAfter.style.left = endPercent;
  timelineShadeAfter.style.width = `${100 - percentages.end}%`;
  startTooltip.style.left = startPercent;
  endTooltip.style.left = endPercent;
  startTooltip.textContent = formatTime(trimRange.start);
  endTooltip.textContent = formatTime(trimRange.end);
  startRange.setAttribute('aria-valuetext', formatTime(trimRange.start));
  endRange.setAttribute('aria-valuetext', formatTime(trimRange.end));
}

function setTrimValue(
  handle: TrimHandle,
  value: number,
  seekPreview = true,
): void {
  releaseResult();
  exportMessage.hidden = true;
  trimRange = updateTrimRange(
    trimRange,
    handle,
    value,
    video.duration,
  );
  renderTrimRange();
  stopSelectionPlayback();

  if (seekPreview && Number.isFinite(video.duration)) {
    const seekTime = handle === 'start' ? trimRange.start : trimRange.end;
    video.currentTime = seekTime;
  }
}

function updatePlayhead(): void {
  if (!Number.isFinite(video.duration) || video.duration <= 0) {
    timelinePlayhead.style.left = '0%';
    return;
  }

  const position = Math.min(
    100,
    Math.max(0, (video.currentTime / video.duration) * 100),
  );
  timelinePlayhead.style.left = `${position}%`;
}

function renderThumbnail(thumbnail: GeneratedThumbnail, index: number): void {
  const slot = thumbnailStrip.children.item(index);
  if (!(slot instanceof HTMLElement)) {
    URL.revokeObjectURL(thumbnail.url);
    return;
  }

  thumbnailUrls.push(thumbnail.url);
  const image = document.createElement('img');
  image.src = thumbnail.url;
  image.alt = '';
  image.decoding = 'async';
  slot.replaceChildren(image);
  slot.classList.add('thumbnail-slot--ready');
}

async function startThumbnailGeneration(): Promise<void> {
  if (!currentUrl || !Number.isFinite(video.duration)) {
    return;
  }

  clearThumbnails();
  const controller = new AbortController();
  thumbnailController = controller;
  const count = getThumbnailCount(timeline.clientWidth);

  for (let index = 0; index < count; index += 1) {
    const slot = document.createElement('span');
    slot.className = 'thumbnail-slot';
    thumbnailStrip.append(slot);
  }

  thumbnailStatus.textContent = `Generating 0 of ${count} frames`;
  thumbnailStatus.classList.remove('thumbnail-status--error');
  let generated = 0;

  try {
    await generateThumbnails({
      count,
      duration: video.duration,
      signal: controller.signal,
      sourceUrl: currentUrl,
      onThumbnail: (thumbnail) => {
        renderThumbnail(thumbnail, generated);
        generated += 1;
        thumbnailStatus.textContent = `Generating ${generated} of ${count} frames`;
      },
    });

    if (!controller.signal.aborted) {
      thumbnailStatus.textContent = `${count} preview frames`;
    }
  } catch (error) {
    if (!(error instanceof DOMException && error.name === 'AbortError')) {
      thumbnailStatus.textContent = 'Preview frames unavailable';
      thumbnailStatus.classList.add('thumbnail-status--error');
    }
  } finally {
    if (thumbnailController === controller) {
      thumbnailController = undefined;
    }
  }
}

function initializeTrimInterface(): void {
  trimRange = { start: 0, end: video.duration };
  const max = String(video.duration);

  startRange.max = max;
  endRange.max = max;
  startInput.max = max;
  endInput.max = max;
  timelineEndLabel.textContent = formatTime(video.duration);
  trimSection.hidden = false;
  renderTrimRange();
  updatePlayhead();
  void startThumbnailGeneration();
}

function showImportView(): void {
  releaseCurrentVideo();
  videoInput.value = '';
  previewPanel.hidden = true;
  importPanel.hidden = false;
  trustRow.hidden = false;
  hero.classList.remove('hero--compact');
  previewMessage.hidden = true;
  dropZone.focus();
}

function showPreviewError(message: string): void {
  previewLoading.hidden = true;
  previewMessage.textContent = message;
  previewMessage.className = 'import-message import-message--error';
  previewMessage.hidden = false;
}

function handleVideoFile(file: File): void {
  clearImportError();

  const validationError = validateVideoFile(file);
  if (validationError) {
    showImportError(validationError);
    videoInput.value = '';
    return;
  }

  releaseCurrentVideo();
  currentFile = file;
  currentUrl = URL.createObjectURL(file);

  filename.textContent = file.name;
  duration.textContent = '—';
  resolution.textContent = '—';
  size.textContent = formatBytes(file.size);
  format.textContent = getVideoFormat(file.name);
  previewMessage.hidden = true;
  previewLoading.hidden = false;

  importPanel.hidden = true;
  previewPanel.hidden = false;
  trustRow.hidden = true;
  hero.classList.add('hero--compact');

  video.src = currentUrl;
  video.load();
}

video.addEventListener('loadedmetadata', () => {
  if (!currentFile || !Number.isFinite(video.duration) || video.duration <= 0) {
    showPreviewError(
      'This video does not contain readable duration information. Try another MP4 or MOV file.',
    );
    return;
  }

  if (video.videoWidth <= 0 || video.videoHeight <= 0) {
    showPreviewError(
      'The browser could not decode this video track. The file may use an unsupported codec.',
    );
    return;
  }

  duration.textContent = formatTime(video.duration);
  resolution.textContent = `${video.videoWidth} × ${video.videoHeight}`;
  previewLoading.hidden = true;
  initializeTrimInterface();

  const sizeNotice = getVideoSizeNotice(currentFile.size);
  if (sizeNotice) {
    previewMessage.textContent = sizeNotice;
    previewMessage.className = 'import-message import-message--notice';
    previewMessage.hidden = false;
  }
});

video.addEventListener('error', () => {
  showPreviewError(
    'This file could not be played in your browser. It may contain an unsupported video codec.',
  );
});

video.addEventListener('timeupdate', () => {
  updatePlayhead();

  if (playingSelection && video.currentTime >= trimRange.end - 0.01) {
    video.pause();
    video.currentTime = trimRange.end;
    updatePlayhead();
    stopSelectionPlayback();
  }
});

video.addEventListener('ended', stopSelectionPlayback);

function handleRangeInput(handle: TrimHandle, input: HTMLInputElement): void {
  setTrimValue(handle, Number.parseFloat(input.value));
}

function handleRangeKeydown(
  event: KeyboardEvent,
  handle: TrimHandle,
): void {
  const directions: Partial<Record<string, number>> = {
    ArrowDown: -1,
    ArrowLeft: -1,
    ArrowRight: 1,
    ArrowUp: 1,
  };
  const direction = directions[event.key];

  if (!direction) {
    return;
  }

  event.preventDefault();
  const step = event.altKey ? 0.01 : event.shiftKey ? 1 : 0.1;
  const currentValue =
    handle === 'start' ? trimRange.start : trimRange.end;
  setTrimValue(handle, currentValue + direction * step);
}

startRange.addEventListener('input', () => {
  handleRangeInput('start', startRange);
});

endRange.addEventListener('input', () => {
  handleRangeInput('end', endRange);
});

startRange.addEventListener('keydown', (event) => {
  handleRangeKeydown(event, 'start');
});

endRange.addEventListener('keydown', (event) => {
  handleRangeKeydown(event, 'end');
});

function bindHandleTooltip(
  input: HTMLInputElement,
  tooltip: HTMLElement,
): void {
  input.addEventListener('focus', () => {
    tooltip.classList.add('is-visible');
  });
  input.addEventListener('blur', () => {
    tooltip.classList.remove('is-visible');
  });
}

bindHandleTooltip(startRange, startTooltip);
bindHandleTooltip(endRange, endTooltip);

function handleTimeInput(
  handle: TrimHandle,
  input: HTMLInputElement,
): void {
  const value = Number.parseFloat(input.value);
  if (Number.isFinite(value)) {
    setTrimValue(handle, value);
  }
}

startInput.addEventListener('input', () => {
  handleTimeInput('start', startInput);
});

endInput.addEventListener('input', () => {
  handleTimeInput('end', endInput);
});

startInput.addEventListener('change', renderTrimRange);
endInput.addEventListener('change', renderTrimRange);

timeline.addEventListener('click', (event) => {
  if (
    event.target instanceof HTMLInputElement ||
    !Number.isFinite(video.duration)
  ) {
    return;
  }

  const bounds = timeline.getBoundingClientRect();
  const position = Math.min(
    1,
    Math.max(0, (event.clientX - bounds.left) / bounds.width),
  );
  stopSelectionPlayback();
  video.pause();
  video.currentTime = position * video.duration;
  updatePlayhead();
});

playSelectionButton.addEventListener('click', async () => {
  if (playingSelection) {
    video.pause();
    stopSelectionPlayback();
    return;
  }

  if (
    video.currentTime < trimRange.start ||
    video.currentTime >= trimRange.end - 0.01
  ) {
    video.currentTime = trimRange.start;
  }

  playingSelection = true;
  playSelectionButton.classList.add('is-playing');
  playSelectionLabel.textContent = 'Pause selection';

  try {
    await video.play();
  } catch {
    stopSelectionPlayback();
    showPreviewError('Playback could not start. Try using the video controls.');
  }
});

function updateExportProgress(progress: TrimProgress): void {
  const labels: Record<TrimProgress['phase'], string> = {
    copying: 'Copying selected video and audio…',
    finalizing: 'Finalizing your MP4…',
    parsing: 'Reading video tracks…',
    reading: 'Loading your local file…',
  };
  const percentage = Math.round(progress.progress * 100);

  exportStatus.textContent = labels[progress.phase];
  progressFill.style.width = `${percentage}%`;
  progressTrack.setAttribute('aria-valuenow', String(percentage));
}

trimVideoButton.addEventListener('click', async () => {
  if (!currentFile || trimTask) {
    return;
  }

  releaseResult();
  exportMessage.hidden = true;
  stopSelectionPlayback();
  video.pause();
  setExportBusy(true);
  updateExportProgress({ phase: 'reading', progress: 0 });

  const requestedStart = trimRange.start;
  const task = startLosslessMp4Trim(
    currentFile,
    requestedStart,
    trimRange.end,
    updateExportProgress,
  );
  trimTask = task;

  try {
    const result = await task.result;
    if (trimTask !== task) {
      return;
    }

    trimTask = undefined;
    setExportBusy(false);
    resultUrl = URL.createObjectURL(result.blob);
    resultPreview.src = resultUrl;
    resultPreview.load();
    resultFilename.textContent = result.filename;
    resultDuration.textContent = formatTime(result.duration);
    resultSize.textContent = formatBytes(result.blob.size);
    resultDownloadFilename = result.filename;

    const notice = getAlignmentNotice(
      requestedStart,
      result.actualStartSec,
    );
    alignmentNotice.hidden = !notice;
    alignmentNotice.textContent = notice ?? '';
    resultPanel.hidden = false;
    resultPanel.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
      block: 'nearest',
    });
  } catch (error) {
    trimTask = undefined;
    setExportBusy(false);
    exportMessage.hidden = false;

    if (error instanceof DOMException && error.name === 'AbortError') {
      exportMessage.className = 'import-message import-message--notice';
      exportMessage.textContent = 'Trimming cancelled. Your original video is unchanged.';
    } else {
      exportMessage.className = 'import-message import-message--error';
      exportMessage.textContent =
        error instanceof Error
          ? error.message
          : 'The video could not be trimmed.';
    }
  }
});

cancelExportButton.addEventListener('click', () => {
  cancelActiveTrim();
});

resultPreview.addEventListener('loadedmetadata', () => {
  if (Number.isFinite(resultPreview.duration) && resultPreview.duration > 0) {
    resultDuration.textContent = formatTime(resultPreview.duration);
  }
});

discardResultButton.addEventListener('click', () => {
  releaseResult();
  exportMessage.hidden = true;
  trimSection.scrollIntoView({
    behavior: 'smooth',
    block: 'nearest',
  });
});

function closeDownloadDialog(): void {
  if (filenameDialog.open) {
    filenameDialog.close();
  }
}

downloadResult.addEventListener('click', () => {
  if (!resultUrl || !resultDownloadFilename) {
    return;
  }

  downloadFilename.value = getFilenameStem(resultDownloadFilename);
  filenameError.hidden = true;
  filenameDialog.showModal();
  downloadFilename.focus();
  downloadFilename.select();
});

closeFilenameDialog.addEventListener('click', closeDownloadDialog);
cancelFilenameButton.addEventListener('click', closeDownloadDialog);

downloadFilename.addEventListener('input', () => {
  if (downloadFilename.value.trim()) {
    filenameError.hidden = true;
  }
});

filenameForm.addEventListener('submit', (event) => {
  event.preventDefault();

  if (!resultUrl) {
    closeDownloadDialog();
    return;
  }

  if (!downloadFilename.value.trim()) {
    filenameError.hidden = false;
    downloadFilename.focus();
    return;
  }

  const filename = normalizeDownloadFilename(downloadFilename.value);
  const download = document.createElement('a');
  download.href = resultUrl;
  download.download = filename;
  download.hidden = true;
  document.body.append(download);
  download.click();
  download.remove();
  resultDownloadFilename = filename;
  resultFilename.textContent = filename;
  closeDownloadDialog();
});

videoInput.addEventListener('change', () => {
  const selectedFile = videoInput.files?.[0];
  if (selectedFile) {
    handleVideoFile(selectedFile);
  }
});

dropZone.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    videoInput.click();
  }
});

for (const eventName of ['dragenter', 'dragover', 'dragleave', 'drop']) {
  document.addEventListener(eventName, (event) => {
    event.preventDefault();
  });
}

dropZone.addEventListener('dragenter', () => {
  dragDepth += 1;
  dropZone.classList.add('drop-zone--active');
});

dropZone.addEventListener('dragleave', () => {
  dragDepth = Math.max(0, dragDepth - 1);
  if (dragDepth === 0) {
    dropZone.classList.remove('drop-zone--active');
  }
});

dropZone.addEventListener('drop', (event) => {
  dragDepth = 0;
  dropZone.classList.remove('drop-zone--active');

  const files = event.dataTransfer?.files;
  if (!files || files.length === 0) {
    return;
  }

  if (files.length > 1) {
    showImportError('Choose one video at a time.');
    return;
  }

  const droppedFile = files[0];
  if (droppedFile) {
    handleVideoFile(droppedFile);
  }
});

replaceButton.addEventListener('click', () => {
  videoInput.value = '';
  videoInput.click();
});

removeButton.addEventListener('click', () => {
  showImportView();
});

window.addEventListener('beforeunload', releaseCurrentVideo);
