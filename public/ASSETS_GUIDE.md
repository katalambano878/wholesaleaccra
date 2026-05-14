# Asset Replacement Guide

## Brand icons & logo — already generated

Every brand icon, favicon, and the Open Graph card are generated **automatically** from a single source file at `scripts/brand-assets/logo-source.png`:

| File                          | Size         | Source                                  |
| ----------------------------- | ------------ | --------------------------------------- |
| `/public/favicon.ico`         | 32×32        | derived from `logo-source.png`          |
| `/public/icon-192.png`        | 192×192      | derived from `logo-source.png`          |
| `/public/icon-512.png`        | 512×512      | derived from `logo-source.png`          |
| `/public/apple-touch-icon.png`| 180×180      | derived from `logo-source.png`          |
| `/public/logo.png`            | 800px max    | derived from `logo-source.png`          |
| `/public/og-image.png`        | 1200×630     | logo centered on a magenta background   |

To refresh everything after replacing the logo:

```bash
# 1. Drop your new logo at scripts/brand-assets/logo-source.png
# 2. Regenerate every variant in one go:
npm run assets:generate
```

The generator (`scripts/generate-brand-assets.mjs`) handles padding, centering, transparency, and the OG card composition.

## Hero & section banners — still placeholders

The homepage slider and section heroes look for these files but they don't exist yet. Drop product / lifestyle shots in with these exact filenames:

| File                          | Size           | Used for                                     |
| ----------------------------- | -------------- | -------------------------------------------- |
| `/public/hero-slide-1.png`    | 1920×1080      | Home page hero slider — "New Arrivals"       |
| `/public/hero-slide-2.png`    | 1920×1080      | Home page hero slider — "Wholesale & Retail" |
| `/public/hero-slide-3.png`    | 1920×1080      | Home page hero slider — "Mannequins"         |
| `/public/page-hero-1.png`     | 1920×600       | About / FAQ / blog post hero background      |
| `/public/page-hero-2.png`     | 1920×600       | Shop / Wishlist / Shipping / Cart hero       |
| `/public/page-hero-3.png`     | 1920×600       | Help / Contact / Blog list hero              |
| `/public/page-hero-4.png`     | 1920×600       | Categories / Privacy hero                    |
| `/public/page-hero-5.png`     | 1920×600       | Terms / Cart hero                            |

After adding them, run `npm run images:compress` to bulk-resize and optimise everything for the web.

## Tools

- Favicon generator (richer multi-resolution `.ico`): <https://realfavicongenerator.net>
- Open Graph image creator: <https://og-playground.vercel.app>
- Image optimisation: <https://squoosh.app>
