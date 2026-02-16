#!/usr/bin/env node

const path = require('path');
const { spawnSync } = require('child_process');
const {
  ROOT_DIR,
  parseArgs,
  normalizeStatus,
  assertValidStatus,
  readRegistry,
  writeRegistry,
  slugify,
  todayISO,
  buildPreviewId,
  titleFromSlug
} = require('./lib/registry');
const { scaffoldVariant } = require('./lib/scaffold');

function usage() {
  return `Usage:
  npm run registry -- add-client --name "Client Name" --slug client-slug [--status "Draft"] [--token clienttoken]
  npm run registry -- add-item --client client-slug --slug home-v1 [--title "Homepage v1"] [--status "Draft"] [--notes "..."]
  npm run registry -- set-status --client client-slug --status "Approved"
  npm run registry -- set-token --client client-slug --token token123
  npm run registry -- clear-token --client client-slug
  npm run registry -- archive-client --client client-slug
  npm run registry -- remove-client --client client-slug`;
}

function fail(message) {
  process.stderr.write(`${message}\n\n${usage()}\n`);
  process.exit(1);
}

function runRebuild() {
  const output = spawnSync(process.execPath, [path.join(ROOT_DIR, 'scripts', 'rebuild-pages.js')], { stdio: 'inherit' });
  if (output.status !== 0) {
    process.exit(output.status || 1);
  }
}

const args = parseArgs(process.argv.slice(2));
const command = args._[0];
if (!command) {
  fail('Missing command.');
}

const registry = readRegistry();

function findClient(clientSlug) {
  const normalized = slugify(clientSlug || '');
  if (!normalized) {
    fail('Missing --client slug.');
  }

  const preview = registry.previews.find((entry) => entry.client_slug === normalized);
  if (!preview) {
    fail(`Client not found: ${normalized}`);
  }

  return preview;
}

if (command === 'add-client') {
  if (!args.name) {
    fail('add-client requires --name.');
  }

  const slug = slugify(args.slug || args.name);
  if (!slug) {
    fail('Could not derive a valid slug for add-client.');
  }

  if (registry.previews.some((preview) => preview.client_slug === slug)) {
    fail(`Client slug already exists: ${slug}`);
  }

  const status = normalizeStatus(args.status || 'Draft');
  if (!status) {
    fail('Invalid --status value.');
  }
  assertValidStatus(status);

  const preview = {
    preview_id: buildPreviewId(slug, registry),
    client_name: String(args.name).trim(),
    client_slug: slug,
    status,
    updated_at: todayISO(),
    items: []
  };

  if (args.token) {
    preview.share_token = slugify(args.token);
  }

  registry.previews.push(preview);
  writeRegistry(registry);
  runRebuild();
  process.stdout.write(`Added client ${preview.client_name} (${preview.client_slug})\n`);
  process.exit(0);
}

if (command === 'add-item') {
  const preview = findClient(args.client);
  const itemSlug = slugify(args.slug || '');
  if (!itemSlug) {
    fail('add-item requires --slug.');
  }

  if (preview.items.some((item) => item.slug === itemSlug)) {
    fail(`Item already exists for ${preview.client_slug}: ${itemSlug}`);
  }

  const itemStatus = normalizeStatus(args.status || preview.status);
  if (!itemStatus) {
    fail('Invalid --status value for add-item.');
  }
  assertValidStatus(itemStatus);

  const item = {
    slug: itemSlug,
    title: args.title ? String(args.title).trim() : titleFromSlug(itemSlug),
    status: itemStatus,
    updated_at: todayISO(),
    notes: args.notes ? String(args.notes).trim() : 'New variant added.'
  };

  preview.items.push(item);
  preview.updated_at = todayISO();

  scaffoldVariant(preview, item, { rootDir: ROOT_DIR, force: false });

  writeRegistry(registry);
  runRebuild();
  process.stdout.write(`Added item ${item.slug} for ${preview.client_slug}\n`);
  process.exit(0);
}

if (command === 'set-status') {
  const preview = findClient(args.client);
  const status = normalizeStatus(args.status);
  if (!status) {
    fail('set-status requires a valid --status.');
  }

  preview.status = status;
  preview.updated_at = todayISO();
  writeRegistry(registry);
  runRebuild();
  process.stdout.write(`Updated status for ${preview.client_slug} -> ${status}\n`);
  process.exit(0);
}

if (command === 'set-token') {
  const preview = findClient(args.client);
  if (!args.token) {
    fail('set-token requires --token.');
  }

  const token = slugify(args.token);
  if (!token) {
    fail('Invalid token provided.');
  }

  const collision = registry.previews.find(
    (entry) => entry.client_slug !== preview.client_slug && entry.share_token === token
  );
  if (collision) {
    fail(`Token already used by ${collision.client_slug}: ${token}`);
  }

  preview.share_token = token;
  preview.updated_at = todayISO();
  writeRegistry(registry);
  runRebuild();
  process.stdout.write(`Set share token for ${preview.client_slug} -> ${token}\n`);
  process.exit(0);
}

if (command === 'clear-token') {
  const preview = findClient(args.client);
  delete preview.share_token;
  preview.updated_at = todayISO();
  writeRegistry(registry);
  runRebuild();
  process.stdout.write(`Cleared share token for ${preview.client_slug}\n`);
  process.exit(0);
}

if (command === 'archive-client') {
  const preview = findClient(args.client);
  preview.status = 'Archived';
  preview.updated_at = todayISO();
  writeRegistry(registry);
  runRebuild();
  process.stdout.write(`Archived ${preview.client_slug}\n`);
  process.exit(0);
}

if (command === 'remove-client') {
  const slug = slugify(args.client || '');
  if (!slug) {
    fail('remove-client requires --client.');
  }

  const before = registry.previews.length;
  registry.previews = registry.previews.filter((entry) => entry.client_slug !== slug);

  if (registry.previews.length === before) {
    fail(`Client not found: ${slug}`);
  }

  writeRegistry(registry);
  runRebuild();
  process.stdout.write(`Removed ${slug} from registry.\n`);
  process.exit(0);
}

fail(`Unknown command: ${command}`);
