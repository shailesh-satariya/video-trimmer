# Clipwell

A lightweight, privacy-first video trimmer that runs entirely in the browser.
Choose a video, select one continuous range, and download a lossless MP4 without
uploading the source file.

[Live demo](https://shailesh-satariya.github.io/video-trimmer/) ·
[GitHub Pages workflow](https://github.com/shailesh-satariya/video-trimmer/actions/workflows/deploy-pages.yml)

## Features

- Import MP4 or MOV files by picker or drag and drop.
- Preview the source video and its basic metadata locally.
- Generate a responsive strip of video thumbnails.
- Select a range with accessible dual sliders or exact time inputs.
- Preview only the selected range before exporting.
- Create a lossless, keyframe-aligned MP4 in a Web Worker.
- Show export progress, support cancellation, and preview the result.
- Choose the downloaded filename in a dedicated modal.
- Keep every video frame on the user's device.

## Privacy

Clipwell has no backend, uploads, analytics, or remote media processing. Video
files are read with browser APIs and represented with local object URLs. The
export is created as a local `Blob` and downloaded directly by the browser.

The application does not use:

- FFmpeg or FFmpeg.wasm
- `MediaRecorder`
- React
- Server-side processing

## How trimming works

1. The browser reads the selected local file and loads its metadata.
2. A hidden video element and Canvas generate low-resolution thumbnails.
3. The trim controls define the requested start and end timestamps.
4. MP4Box remuxes compatible encoded samples in a Web Worker.
5. The browser previews and downloads the resulting MP4 `Blob`.

The default export is a fast lossless trim, not a frame-accurate re-encode. Its
start may move slightly earlier to the nearest video keyframe. Clipwell reports
that adjustment after export.

## Browser and media compatibility

Use a modern browser with MP4 playback support. Actual compatibility depends on
the container, codecs, and capabilities provided by the browser and device.

Current scope:

- MP4 and MOV input selection
- MP4 output
- One continuous trim range
- Lossless, keyframe-aligned remuxing

Frame-accurate re-encoding, WebM/MKV export, and multi-segment editing are not
part of the current application.

## Local development

Requirements:

- Node.js 22
- npm
- A modern browser

```bash
git clone https://github.com/shailesh-satariya/video-trimmer.git
cd video-trimmer
npm ci
npm run dev
```

Vite prints the local development URL in the terminal.

## Commands

| Command                | Purpose                                           |
| ---------------------- | ------------------------------------------------- |
| `npm run dev`          | Start the Vite development server                 |
| `npm run build`        | Type-check and create the production build        |
| `npm run preview`      | Preview the production build locally              |
| `npm run check`        | Run strict TypeScript checks                      |
| `npm run lint`         | Run ESLint                                        |
| `npm run lint:fix`     | Apply safe ESLint fixes                           |
| `npm run format`       | Format supported files with Prettier              |
| `npm run format:check` | Check formatting without changing files           |
| `npm run test:run`     | Run the Vitest unit suite once                    |
| `npm run test:a11y`    | Build and run axe accessibility tests in Chromium |
| `npm run quality`      | Run the complete project quality gate             |

Install the Playwright browser once before running accessibility tests on a
fresh machine:

```bash
npx playwright install chromium
```

## Production build

```bash
npm run build
npm run preview
```

The production files are written to `dist/`. Vite is configured with the
`/video-trimmer/` base path required by this repository's GitHub Pages URL.

## GitHub Pages deployment

Deployment is intentionally manual:

1. Open the repository's **Actions** tab.
2. Select **Build and deploy GitHub Pages**.
3. Choose **Run workflow** on the `master` branch.

The workflow installs dependencies, runs the complete quality gate, builds
`dist/`, uploads it as the official `github-pages` artifact, and deploys it to:

<https://shailesh-satariya.github.io/video-trimmer/>

## Technology

- Vanilla TypeScript
- Semantic HTML and modern CSS
- Vite
- Browser media APIs, Canvas, Blob URLs, and Web Workers
- MP4Box for MP4 parsing and remuxing
- Vitest, ESLint, and Prettier
- Playwright and axe-core for accessibility checks

Project-specific development constraints and agent guidance are documented in
[`AGENTS.md`](./AGENTS.md) and [`CLAUDE.md`](./CLAUDE.md).
