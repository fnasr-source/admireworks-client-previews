# Setup Guide

## 1. GitHub repository and Pages

1. Create a GitHub repo named `admireworks-client-previews`.
2. Push this project to `main`.
3. In GitHub: `Settings` -> `Pages`.
4. Under `Build and deployment`:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/ (root)`
5. Confirm `.nojekyll` and `CNAME` are present in the repo root.
6. In the same Pages settings screen, set custom domain to `preview.admireworks.com` and enable HTTPS once DNS resolves.

## 2. DNS for `preview.admireworks.com`

At your DNS provider, create:

- Type: `CNAME`
- Host/Name: `preview`
- Value/Target: `<github-org-or-user>.github.io`

If your org/user is `admireworks`, the target is:

- `admireworks.github.io`

Keep TTL standard (for example, 300s or provider default).

## 3. Add a new client preview

1. Create the client scaffold:

```bash
npm run create:client -- --name "Client Name" --slug client-slug --status "Draft" --token clienttoken --page home-v1
```

2. Add additional page variants:

```bash
npm run registry -- add-item --client client-slug --slug pdp-v1 --title "PDP v1" --status "Ready for Review" --notes "New structure with stronger CTA"
npm run registry -- add-item --client client-slug --slug checkout-v1 --title "Checkout v1" --notes "Simplified fields"
```

3. Edit generated preview files as needed:

- `clients/client-slug/{variant}/index.html`
- `clients/client-slug/{variant}/assets/style.css`

Admireworks brand system is centralized at:

- `assets/theme.css`
- `assets/brand/Logo.png`
- `assets/brand/Brandmark.png`

4. Rebuild listing pages:

```bash
npm run rebuild
```

## 4. Archive or remove previews

Archive (keeps links/history visible as archived):

```bash
npm run registry -- archive-client --client client-slug
```

Fully remove from registry:

```bash
npm run registry -- remove-client --client client-slug
npm run rebuild
```

Then delete old content folders if you no longer need them:

- `clients/client-slug/`
- `s/{share_token}/` (if previously tokenized)

## 5. Sharing links with clients

Human path:

- `https://preview.admireworks.com/clients/{client-slug}/`
- `https://preview.admireworks.com/clients/{client-slug}/{page-slug-version}/`

Tokenized path (if configured):

- `https://preview.admireworks.com/s/{share_token}/`
- `https://preview.admireworks.com/s/{share_token}/{page-slug-version}/`

Use these direct URLs only. Avoid `htmlpreview` wrappers to prevent nested preview issues.
