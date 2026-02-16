# admireworks-client-previews

Dedicated repository for client-facing redesign previews.

This repo is intentionally separate from internal operations/proposals content and is safe to share externally.

## What this repo does

- Serves clean static preview links on GitHub Pages.
- Uses `preview-registry.json` as the single source of truth.
- Centralizes Admireworks visual tokens and fonts in `assets/theme.css`.
- Generates:
  - root listing (`/`) with search, status badges, last-updated timestamps, and open links
  - per-client listing (`/clients/{client-slug}/`)
  - optional tokenized links (`/s/{share_token}/...`) that redirect to the canonical human path

## Quick start

```bash
npm run rebuild
```

Then open:

- `index.html` (root listing)
- `clients/{client-slug}/index.html` (client page)

## Registry format

`preview-registry.json` entries include:

- `preview_id`
- `client_name`
- `client_slug`
- `status` (`Draft`, `Ready for Review`, `Approved`, `Archived`)
- `updated_at` (`YYYY-MM-DD`)
- `items` (array of preview variants)
- `share_token` (optional)

Each item supports:

- `slug` (example: `home-v1`)
- `title`
- `status`
- `updated_at`
- `notes`

## Scripts

- `npm run rebuild`
  - Rebuilds root/client listing pages from the registry.
  - Scaffolds missing variant files at `clients/{client-slug}/{item-slug}/index.html` and `assets/style.css`.
  - Rebuilds token redirects under `/s/{token}/`.

- `npm run create:client -- --name "Client Name" --slug client-slug --status "Draft" --token token123 --page home-v1`
  - Adds a new client preview entry.
  - Creates starter variant scaffold.
  - Rebuilds generated pages.

- `npm run registry -- <command> ...`
  - `add-client`, `add-item`, `set-status`, `set-token`, `clear-token`, `archive-client`, `remove-client`

- `npm run validate:links`
  - Validates local `href` and `src` paths across generated HTML pages.

Examples:

```bash
npm run registry -- add-item --client sunbeam-co --slug checkout-v2 --title "Checkout v2" --status "Ready for Review" --notes "Reduced fields and improved trust indicators"
npm run registry -- archive-client --client atlas-wellness
npm run registry -- set-token --client atlas-wellness --token aw26
```

## Link-sharing format examples

Human-readable links:

- `https://preview.admireworks.com/clients/sunbeam-co/`
- `https://preview.admireworks.com/clients/sunbeam-co/home-v1/`

Tokenized links (if `share_token` exists):

- `https://preview.admireworks.com/s/sb26/`
- `https://preview.admireworks.com/s/sb26/pdp-v2/`

Both link types are direct GitHub Pages-safe URLs (no nested `htmlpreview` wrappers).

## Included sample clients

- `Sunbeam Co.` (tokenized sharing enabled)
- `Atlas Wellness`
- `Genco` (migrated from `draft-peviews/` with Admireworks theming)

Each includes 2-3 sample preview variants in the registry.

## Admireworks brand system

- Theme tokens and `@font-face`: `assets/theme.css`
- Logos: `assets/brand/Logo.png`, `assets/brand/Brandmark.png`
- Fonts:
  - `Jaymont` (display/headings)
  - `Akkurat Pro` (body/UI)
  - `Noor` (Arabic content)
