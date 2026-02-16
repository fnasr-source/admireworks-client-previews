#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { ROOT_DIR, readRegistry, ensureDirectory } = require('./lib/registry');
const { scaffoldVariant } = require('./lib/scaffold');

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function splitNotes(notes) {
  if (!notes) {
    return [];
  }

  return String(notes)
    .split(/\n|;\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
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

function statusClass(status) {
  return status
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z-]/g, '');
}

function writeFile(filePath, content) {
  ensureDirectory(path.dirname(filePath));
  fs.writeFileSync(filePath, content);
}

function humanClientPath(preview) {
  return `/clients/${preview.client_slug}/`;
}

function humanItemPath(preview, item) {
  return `/clients/${preview.client_slug}/${item.slug}/`;
}

function shareClientPath(preview) {
  return preview.share_token ? `/s/${preview.share_token}/` : humanClientPath(preview);
}

function shareItemPath(preview, item) {
  return preview.share_token ? `/s/${preview.share_token}/${item.slug}/` : humanItemPath(preview, item);
}

function shareLandingPath(preview) {
  if (preview.share_home_item_slug) {
    const preferred = preview.items.find((item) => item.slug === preview.share_home_item_slug);
    if (preferred) {
      return humanItemPath(preview, preferred);
    }
  }

  return humanClientPath(preview);
}

function renderRedirectPage(targetPath, label) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Redirecting…</title>
  <meta http-equiv="refresh" content="0;url=${escapeHtml(targetPath)}">
  <script>window.location.replace(${JSON.stringify(targetPath)});</script>
</head>
<body>
  <p>Redirecting to ${escapeHtml(label)}. If it does not load, <a href="${escapeHtml(targetPath)}">open it here</a>.</p>
</body>
</html>
`;
}

function renderIndexPage(previews) {
  const sorted = [...previews].sort((a, b) => b.updated_at.localeCompare(a.updated_at));

  const cards = sorted.length
    ? sorted
        .map((preview) => {
          const searchValue = [
            preview.client_name,
            preview.client_slug,
            preview.preview_id,
            ...preview.items.map((item) => item.slug)
          ]
            .join(' ')
            .toLowerCase();

          const variants = preview.items
            .slice(0, 3)
            .map(
              (item) =>
                `<a class="chip" href="${escapeHtml(shareItemPath(preview, item))}">${escapeHtml(item.slug)}</a>`
            )
            .join('');

          const more =
            preview.items.length > 3
              ? `<span class="chip chip-muted">+${preview.items.length - 3} more</span>`
              : '';

          return `<article class="preview-card" data-search="${escapeHtml(searchValue)}">
  <div class="card-head">
    <h2>${escapeHtml(preview.client_name)}</h2>
    <span class="status-badge status-${escapeHtml(statusClass(preview.status))}">${escapeHtml(preview.status)}</span>
  </div>
  <p class="card-sub">${escapeHtml(preview.client_slug)} · Updated ${escapeHtml(formatDate(preview.updated_at))}</p>
  <div class="chip-row">${variants}${more}</div>
  <div class="card-actions">
    <a class="btn btn-primary" href="${escapeHtml(shareClientPath(preview))}">Open Preview</a>
    <a class="btn btn-secondary" href="${escapeHtml(humanClientPath(preview))}">Client Page</a>
  </div>
</article>`;
        })
        .join('\n')
    : '<p class="empty-state">No previews found in <code>preview-registry.json</code>.</p>';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Admireworks Client Previews</title>
  <meta name="description" content="Admireworks redesign preview hub for client-facing review links.">
  <link rel="stylesheet" href="/assets/theme.css">
  <link rel="stylesheet" href="/assets/site.css">
  <script src="/assets/search.js" defer></script>
</head>
<body class="page page-index">
  <div class="bg-layer" aria-hidden="true"></div>
  <header class="shell hero-shell">
    <div class="brand-bar">
      <img class="brand-logo" src="/assets/brand/Logo.png" alt="Admireworks logo">
      <img class="brand-mark" src="/assets/brand/Brandmark.png" alt="Admireworks brandmark">
    </div>
    <p class="eyebrow">Admireworks Preview Hub</p>
    <h1>Client Redesign Previews</h1>
    <p class="lead">Share clean, render-safe links for each redesign without internal proposal context.</p>
    <label class="search-wrap" for="searchInput">
      <span>Search by client name or slug</span>
      <input id="searchInput" type="search" placeholder="Try: sunbeam, atlas, checkout-v1" autocomplete="off">
    </label>
    <p class="build-stamp">Built from <code>preview-registry.json</code> · ${escapeHtml(formatDate(new Date().toISOString()))}</p>
  </header>

  <main class="shell" aria-live="polite">
    <section id="previewGrid" class="preview-grid">
      ${cards}
    </section>
    <p id="noResults" class="empty-state" hidden>No matching previews for the current search.</p>
  </main>
</body>
</html>
`;
}

function renderClientPage(preview) {
  const items = [...preview.items].sort((a, b) => b.updated_at.localeCompare(a.updated_at));

  const cards = items
    .map((item) => {
      const notes = splitNotes(item.notes);
      const notesMarkup = notes.length
        ? notes.map((note) => `<li>${escapeHtml(note)}</li>`).join('')
        : '<li>No notes yet.</li>';

      const shareLink = shareItemPath(preview, item);

      return `<article class="variant-card">
  <div class="card-head">
    <h2>${escapeHtml(item.title || item.slug)}</h2>
    <span class="status-badge status-${escapeHtml(statusClass(item.status || preview.status))}">${escapeHtml(
        item.status || preview.status
      )}</span>
  </div>
  <p class="card-sub">${escapeHtml(item.slug)} · Updated ${escapeHtml(formatDate(item.updated_at))}</p>
  <h3>Notes / Changelog</h3>
  <ul class="notes-list">${notesMarkup}</ul>
  <div class="card-actions">
    <a class="btn btn-primary" href="${escapeHtml(shareLink)}">Open Preview</a>
  </div>
</article>`;
    })
    .join('\n');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(preview.client_name)} · Admireworks Previews</title>
  <meta name="description" content="Preview variants for ${escapeHtml(preview.client_name)} redesign.">
  <link rel="stylesheet" href="/assets/theme.css">
  <link rel="stylesheet" href="/assets/site.css">
</head>
<body class="page page-client">
  <div class="bg-layer" aria-hidden="true"></div>
  <header class="shell hero-shell">
    <div class="brand-bar">
      <img class="brand-logo" src="/assets/brand/Logo.png" alt="Admireworks logo">
      <img class="brand-mark" src="/assets/brand/Brandmark.png" alt="Admireworks brandmark">
    </div>
    <p><a class="crumb" href="/">← All client previews</a></p>
    <div class="title-row">
      <h1>${escapeHtml(preview.client_name)}</h1>
      <span class="status-badge status-${escapeHtml(statusClass(preview.status))}">${escapeHtml(preview.status)}</span>
    </div>
    <p class="lead">${escapeHtml(preview.items.length)} active page variants · Last updated ${escapeHtml(
      formatDate(preview.updated_at)
    )}</p>
  </header>

  <main class="shell">
    <section class="variant-grid">
      ${cards}
    </section>
  </main>
</body>
</html>
`;
}

function rebuild() {
  const registry = readRegistry();

  writeFile(path.join(ROOT_DIR, 'index.html'), renderIndexPage(registry.previews));

  registry.previews.forEach((preview) => {
    const clientDir = path.join(ROOT_DIR, 'clients', preview.client_slug);
    ensureDirectory(clientDir);

    writeFile(path.join(clientDir, 'index.html'), renderClientPage(preview));

    preview.items.forEach((item) => {
      scaffoldVariant(preview, item, { rootDir: ROOT_DIR, force: false });
    });
  });

  const shareRoot = path.join(ROOT_DIR, 's');
  fs.rmSync(shareRoot, { recursive: true, force: true });

  registry.previews.forEach((preview) => {
    if (!preview.share_token) {
      return;
    }

    writeFile(
      path.join(shareRoot, preview.share_token, 'index.html'),
      renderRedirectPage(shareLandingPath(preview), `${preview.client_name} preview`)
    );

    preview.items.forEach((item) => {
      writeFile(
        path.join(shareRoot, preview.share_token, item.slug, 'index.html'),
        renderRedirectPage(humanItemPath(preview, item), `${preview.client_name} ${item.slug}`)
      );
    });
  });

  process.stdout.write(`Rebuilt ${registry.previews.length} client listings from preview-registry.json.\n`);
}

rebuild();
