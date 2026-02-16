#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

function listHtmlFiles(startDir) {
  const out = [];

  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === '.git' || entry.name === 'node_modules') {
        continue;
      }

      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && entry.name.endsWith('.html')) {
        out.push(full);
      }
    }
  }

  walk(startDir);
  return out;
}

function isExternal(link) {
  return /^(https?:|mailto:|tel:|javascript:|data:|\/\/)/i.test(link);
}

function normalizeLink(link) {
  return link.split('#')[0].split('?')[0].trim();
}

function resolveTarget(fromFile, link) {
  const clean = normalizeLink(link);
  if (!clean || clean === '#') {
    return null;
  }

  if (isExternal(clean)) {
    return null;
  }

  if (clean.startsWith('/')) {
    return path.join(ROOT, clean);
  }

  return path.resolve(path.dirname(fromFile), clean);
}

function targetExists(targetPath) {
  if (fs.existsSync(targetPath)) {
    return true;
  }

  if (fs.existsSync(`${targetPath}.html`)) {
    return true;
  }

  if (fs.existsSync(path.join(targetPath, 'index.html'))) {
    return true;
  }

  return false;
}

function collectLinks(html) {
  const links = [];
  const pattern = /(href|src)=\"([^\"]+)\"/g;
  let match;

  while ((match = pattern.exec(html))) {
    links.push(match[2]);
  }

  return links;
}

function main() {
  const htmlFiles = [
    path.join(ROOT, 'index.html'),
    ...listHtmlFiles(path.join(ROOT, 'clients')),
    ...listHtmlFiles(path.join(ROOT, 's'))
  ].filter((filePath) => fs.existsSync(filePath));

  const errors = [];

  for (const filePath of htmlFiles) {
    const html = fs.readFileSync(filePath, 'utf8');
    const links = collectLinks(html);

    for (const link of links) {
      const target = resolveTarget(filePath, link);
      if (!target) {
        continue;
      }

      if (!targetExists(target)) {
        errors.push({
          file: path.relative(ROOT, filePath),
          link
        });
      }
    }
  }

  if (errors.length) {
    process.stderr.write('Broken links detected:\n');
    errors.forEach((entry) => {
      process.stderr.write(`- ${entry.file}: ${entry.link}\n`);
    });
    process.exit(1);
  }

  process.stdout.write(`Validated ${htmlFiles.length} HTML files with no broken local links.\n`);
}

main();
