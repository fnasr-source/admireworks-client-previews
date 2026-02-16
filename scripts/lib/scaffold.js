const fs = require('fs');
const path = require('path');
const { ensureDirectory, ROOT_DIR } = require('./registry');
const { renderVariantStyles, renderVariantPage } = require('./templates');

function writeIfMissing(filePath, content, force = false) {
  if (!force && fs.existsSync(filePath)) {
    return false;
  }

  fs.writeFileSync(filePath, content);
  return true;
}

function scaffoldVariant(preview, item, options = {}) {
  const rootDir = options.rootDir || ROOT_DIR;
  const force = Boolean(options.force);

  const variantDir = path.join(rootDir, 'clients', preview.client_slug, item.slug);
  const assetsDir = path.join(variantDir, 'assets');
  ensureDirectory(assetsDir);

  writeIfMissing(
    path.join(variantDir, 'index.html'),
    renderVariantPage({
      clientName: preview.client_name,
      clientSlug: preview.client_slug,
      item,
      clientStatus: preview.status
    }),
    force
  );

  writeIfMissing(
    path.join(assetsDir, 'style.css'),
    renderVariantStyles(`${preview.client_slug}:${item.slug}`),
    force
  );
}

module.exports = {
  scaffoldVariant
};
