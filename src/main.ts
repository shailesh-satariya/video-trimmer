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

      <section class="workspace-card" aria-labelledby="import-title">
        <div class="workspace-heading">
          <div>
            <span class="step-number">01</span>
            <div>
              <h2 id="import-title">Choose your video</h2>
              <p>Start with an MP4 file from your device.</p>
            </div>
          </div>
          <span class="local-pill">
            <span aria-hidden="true"></span>
            Local only
          </span>
        </div>

        <label class="drop-zone" for="video-input">
          <input id="video-input" type="file" accept="video/mp4,video/quicktime" />
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
      </section>

      <section class="trust-row" aria-label="Product benefits">
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

