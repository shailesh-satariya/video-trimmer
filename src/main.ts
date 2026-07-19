import { formatTime } from './lib/time';
import {
  formatBytes,
  getVideoFormat,
  getVideoSizeNotice,
  validateVideoFile,
} from './lib/video-file';
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

        <div class="next-step">
          <div>
            <span>Up next</span>
            <strong>Create thumbnails and choose the trim range</strong>
          </div>
          <span class="next-step-marker" aria-hidden="true">02</span>
        </div>
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

let currentUrl: string | undefined;
let currentFile: File | undefined;
let dragDepth = 0;

function showImportError(message: string): void {
  importError.textContent = message;
  importError.hidden = false;
}

function clearImportError(): void {
  importError.textContent = '';
  importError.hidden = true;
}

function releaseCurrentVideo(): void {
  video.pause();
  video.removeAttribute('src');
  video.load();

  if (currentUrl) {
    URL.revokeObjectURL(currentUrl);
    currentUrl = undefined;
  }

  currentFile = undefined;
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
