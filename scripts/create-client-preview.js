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

function exitWithUsage(message) {
  if (message) {
    process.stderr.write(`${message}\n\n`);
  }

  process.stderr.write(`Usage:\n`);
  process.stderr.write(`  npm run create:client -- --name "Sunbeam Co." --slug sunbeam-co [--status "Draft"] [--token sb26] [--page home-v1]\n`);
  process.exit(1);
}

const args = parseArgs(process.argv.slice(2));

if (!args.name) {
  exitWithUsage('Missing required --name argument.');
}

const slug = args.slug ? slugify(args.slug) : slugify(args.name);
if (!slug) {
  exitWithUsage('Could not derive a valid client slug.');
}

const status = normalizeStatus(args.status || 'Draft');
if (!status) {
  exitWithUsage('Invalid --status value.');
}
assertValidStatus(status);

const firstItemSlug = slugify(args.page || 'home-v1');
if (!firstItemSlug) {
  exitWithUsage('Invalid --page value.');
}

const registry = readRegistry();
if (registry.previews.some((preview) => preview.client_slug === slug)) {
  exitWithUsage(`Client slug already exists in registry: ${slug}`);
}

const preview = {
  preview_id: buildPreviewId(slug, registry),
  client_name: String(args.name).trim(),
  client_slug: slug,
  status,
  updated_at: todayISO(),
  items: [
    {
      slug: firstItemSlug,
      title: args.title ? String(args.title).trim() : titleFromSlug(firstItemSlug),
      status,
      updated_at: todayISO(),
      notes: args.notes ? String(args.notes).trim() : 'Initial preview scaffold created.'
    }
  ]
};

if (args.token) {
  preview.share_token = slugify(args.token);
}

registry.previews.push(preview);
writeRegistry(registry);

scaffoldVariant(preview, preview.items[0], { rootDir: ROOT_DIR, force: false });

const rebuild = spawnSync(process.execPath, [path.join(ROOT_DIR, 'scripts', 'rebuild-pages.js')], {
  stdio: 'inherit'
});
if (rebuild.status !== 0) {
  process.exit(rebuild.status || 1);
}

process.stdout.write(`Created client preview: ${preview.client_name} (${preview.client_slug})\n`);
process.stdout.write(`Starter page: /clients/${preview.client_slug}/${preview.items[0].slug}/\n`);
