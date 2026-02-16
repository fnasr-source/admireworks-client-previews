const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const REGISTRY_PATH = path.join(ROOT_DIR, 'preview-registry.json');

const VALID_STATUSES = ['Draft', 'Ready for Review', 'Approved', 'Archived'];
const STATUS_SET = new Set(VALID_STATUSES);

function parseArgs(argv) {
  const args = { _: [] };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];

    if (!token.startsWith('--')) {
      args._.push(token);
      continue;
    }

    const key = token.slice(2);
    const next = argv[i + 1];

    if (!next || next.startsWith('--')) {
      args[key] = true;
      continue;
    }

    args[key] = next;
    i += 1;
  }

  return args;
}

function normalizeStatus(input) {
  if (!input) {
    return null;
  }

  const matched = VALID_STATUSES.find((status) => status.toLowerCase() === String(input).trim().toLowerCase());
  return matched || null;
}

function assertValidStatus(status, context = 'status') {
  if (!STATUS_SET.has(status)) {
    throw new Error(`Invalid ${context}: "${status}". Expected one of: ${VALID_STATUSES.join(', ')}.`);
  }
}

function readRegistry() {
  if (!fs.existsSync(REGISTRY_PATH)) {
    return { registry_version: 1, previews: [] };
  }

  const raw = fs.readFileSync(REGISTRY_PATH, 'utf8');
  const data = JSON.parse(raw);

  if (!Array.isArray(data.previews)) {
    throw new Error('preview-registry.json must contain a "previews" array.');
  }

  const previewIds = new Set();
  const slugs = new Set();
  const shareTokens = new Set();

  data.previews.forEach((preview) => {
    if (!preview.preview_id) {
      throw new Error('Each preview must include "preview_id".');
    }
    if (!preview.client_name) {
      throw new Error(`Preview ${preview.preview_id} is missing "client_name".`);
    }
    if (!preview.client_slug) {
      throw new Error(`Preview ${preview.preview_id} is missing "client_slug".`);
    }

    if (previewIds.has(preview.preview_id)) {
      throw new Error(`Duplicate preview_id detected: ${preview.preview_id}`);
    }
    previewIds.add(preview.preview_id);

    if (slugs.has(preview.client_slug)) {
      throw new Error(`Duplicate client_slug detected: ${preview.client_slug}`);
    }
    slugs.add(preview.client_slug);

    assertValidStatus(preview.status, `status for ${preview.client_slug}`);

    if (preview.share_token) {
      if (shareTokens.has(preview.share_token)) {
        throw new Error(`Duplicate share_token detected: ${preview.share_token}`);
      }
      shareTokens.add(preview.share_token);
    }

    if (!Array.isArray(preview.items)) {
      throw new Error(`Preview ${preview.client_slug} must have an "items" array.`);
    }

    const itemSlugs = new Set();
    preview.items.forEach((item) => {
      if (!item.slug) {
        throw new Error(`A preview item in ${preview.client_slug} is missing "slug".`);
      }
      if (itemSlugs.has(item.slug)) {
        throw new Error(`Duplicate item slug "${item.slug}" in ${preview.client_slug}.`);
      }
      itemSlugs.add(item.slug);
      assertValidStatus(item.status || preview.status, `item status for ${preview.client_slug}/${item.slug}`);
    });

    if (preview.share_home_item_slug && !preview.items.some((item) => item.slug === preview.share_home_item_slug)) {
      throw new Error(
        `share_home_item_slug "${preview.share_home_item_slug}" does not match any item in ${preview.client_slug}.`
      );
    }
  });

  return data;
}

function writeRegistry(registry) {
  const ordered = {
    registry_version: registry.registry_version || 1,
    previews: [...registry.previews].sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  };

  fs.writeFileSync(REGISTRY_PATH, `${JSON.stringify(ordered, null, 2)}\n`);
}

function slugify(text) {
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function buildPreviewId(clientSlug, registry) {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 12);
  const base = `pvw_${clientSlug}_${stamp}`;

  if (!registry.previews.some((preview) => preview.preview_id === base)) {
    return base;
  }

  let counter = 2;
  let candidate = `${base}_${counter}`;
  while (registry.previews.some((preview) => preview.preview_id === candidate)) {
    counter += 1;
    candidate = `${base}_${counter}`;
  }
  return candidate;
}

function titleFromSlug(slug) {
  return slug
    .split('-')
    .map((piece) => {
      if (/^v\d+$/i.test(piece)) {
        return piece.toLowerCase();
      }
      return piece.charAt(0).toUpperCase() + piece.slice(1);
    })
    .join(' ')
    .replace(/\s+v(\d+)$/i, ' v$1');
}

module.exports = {
  ROOT_DIR,
  REGISTRY_PATH,
  VALID_STATUSES,
  parseArgs,
  normalizeStatus,
  assertValidStatus,
  readRegistry,
  writeRegistry,
  slugify,
  todayISO,
  ensureDirectory,
  buildPreviewId,
  titleFromSlug
};
