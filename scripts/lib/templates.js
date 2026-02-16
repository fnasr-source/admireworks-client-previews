function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(parsed);
}

function splitNotes(notes) {
  if (!notes) {
    return [];
  }

  return String(notes)
    .split(/\n|;\s*/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function renderVariantStyles() {
  return `@import url('/assets/theme.css');

:root {
  --accent: var(--aw-gold);
  --bg: #f6f4ee;
  --ink: var(--aw-ink);
  --muted: var(--aw-ink-soft);
  --card: #ffffff;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  font-family: var(--aw-font-body);
  color: var(--ink);
  background:
    radial-gradient(circle at 14% 10%, rgba(204, 159, 83, 0.12) 0%, rgba(204, 159, 83, 0) 42%),
    radial-gradient(circle at 85% 80%, rgba(0, 26, 112, 0.16) 0%, rgba(0, 26, 112, 0) 48%),
    linear-gradient(145deg, #f6efe1 0%, #f0f5ff 48%, #ebf1ff 100%);
}

.preview {
  max-width: 920px;
  margin: 0 auto;
  padding: 2.2rem 1.1rem 3rem;
}

.breadcrumb {
  display: inline-block;
  margin-bottom: 1rem;
  color: var(--muted);
  text-decoration: none;
  font-size: 0.92rem;
}

.hero {
  background: var(--card);
  border: 1px solid var(--aw-line);
  border-radius: 1.2rem;
  padding: 1.5rem;
  box-shadow: 0 15px 34px rgba(0, 26, 112, 0.08);
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background: rgba(0, 26, 112, 0.07);
  color: var(--ink);
  border-radius: 999px;
  padding: 0.25rem 0.75rem;
  font-size: 0.77rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

h1 {
  margin: 0.85rem 0 0.5rem;
  font-family: var(--aw-font-display);
  color: var(--aw-navy);
  font-size: clamp(1.5rem, 2.8vw, 2.1rem);
  line-height: 1.16;
}

p {
  margin: 0;
  color: var(--muted);
  line-height: 1.55;
}

.notes {
  margin-top: 1.2rem;
  display: grid;
  gap: 0.55rem;
}

.note {
  background: color-mix(in srgb, var(--accent) 12%, white 88%);
  border-left: 3px solid var(--accent);
  border-radius: 0.62rem;
  padding: 0.65rem 0.75rem;
  color: #27345e;
  font-size: 0.95rem;
}

.showcase {
  margin-top: 1.1rem;
  background: var(--card);
  border-radius: 1rem;
  border: 1px solid var(--aw-line);
  overflow: hidden;
}

.showcase-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.8rem;
  padding: 0.9rem 1rem;
  border-bottom: 1px solid var(--aw-line);
}

.showcase-head strong {
  font-size: 0.94rem;
}

.canvas {
  min-height: 220px;
  padding: 1.1rem;
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(12, minmax(0, 1fr));
}

.block {
  min-height: 70px;
  border-radius: 0.8rem;
  background: linear-gradient(180deg, rgba(0, 26, 112, 0.06) 0%, rgba(0, 26, 112, 0.04) 100%);
  border: 1px solid var(--aw-line);
}

.block.hero {
  grid-column: span 12;
}

.block.one,
.block.two,
.block.three {
  grid-column: span 4;
}

@media (max-width: 700px) {
  .preview {
    padding: 1.3rem 0.85rem 2rem;
  }

  .hero {
    padding: 1.1rem;
  }

  .canvas {
    grid-template-columns: 1fr;
  }

  .block.one,
  .block.two,
  .block.three,
  .block.hero {
    grid-column: span 1;
  }
}`;
}

function renderVariantPage({ clientName, clientSlug, item, clientStatus }) {
  const notes = splitNotes(item.notes);
  const notesMarkup = notes.length
    ? notes.map((note) => `<div class="note">${escapeHtml(note)}</div>`).join('\n')
    : '<div class="note">No notes have been logged for this version yet.</div>';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(clientName)} · ${escapeHtml(item.title || item.slug)}</title>
  <meta name="description" content="${escapeHtml(clientName)} redesign preview: ${escapeHtml(item.title || item.slug)}">
  <link rel="stylesheet" href="./assets/style.css">
</head>
<body>
  <main class="preview">
    <div class="aw-brand-strip" style="margin-bottom:0.9rem;">
      <img class="aw-brand-logo" src="/assets/brand/Logo.png" alt="Admireworks logo">
      <img class="aw-brandmark" src="/assets/brand/Brandmark.png" alt="Admireworks brandmark">
    </div>
    <a class="breadcrumb" href="/clients/${escapeHtml(clientSlug)}/">Back to ${escapeHtml(clientName)} previews</a>

    <section class="hero">
      <span class="tag">${escapeHtml(item.status || clientStatus)}</span>
      <h1>${escapeHtml(item.title || item.slug)}</h1>
      <p>Client: ${escapeHtml(clientName)} · Last updated ${escapeHtml(formatDate(item.updated_at))}</p>

      <div class="notes">
        ${notesMarkup}
      </div>
    </section>

    <section class="showcase" aria-label="Preview wireframe placeholders">
      <div class="showcase-head">
        <strong>Rendered Preview Canvas</strong>
        <span class="tag">Prototype</span>
      </div>
      <div class="canvas">
        <div class="block hero"></div>
        <div class="block one"></div>
        <div class="block two"></div>
        <div class="block three"></div>
      </div>
    </section>
  </main>
</body>
</html>
`;
}

module.exports = {
  renderVariantStyles,
  renderVariantPage
};
