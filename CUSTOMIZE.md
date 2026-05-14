# Customization Checklist

This codebase has been forensically stripped of its original ownership. Every brand-identifying string, asset, ID, and metadata field has been replaced with a clearly marked placeholder. Complete the items below to make this project fully yours.

> Tip: open every file matching the placeholders below in your editor's project-wide find/replace and swap them out in one pass.

## 1. Identity strings (find & replace across the entire project)

| Placeholder              | What to replace it with                                |
| ------------------------ | ------------------------------------------------------ |
| `YOUR_PROJECT_NAME`      | The project / repo name                                |
| `YOUR_PROJECT_DESCRIPTION` | One-line description for `package.json` + README     |
| `YOUR_BRAND_NAME`        | Wordmark shown in header, footer, PWA, admin chrome   |
| `YOUR_STORE_NAME`        | Store display name (also `NEXT_PUBLIC_SITE_NAME`)     |
| `YOUR_APP_NAME`          | Full PWA name (manifest.json)                          |
| `YOUR_SHORT_NAME`        | Short PWA name (manifest.json)                         |
| `YOUR_APP_DESCRIPTION`   | PWA description (manifest.json)                        |
| `YOUR_TAGLINE`           | One-line marketing tagline                             |
| `YOUR_HEADLINE`          | Homepage hero headline (3 slides)                      |
| `YOUR_SUBHEADLINE`       | Homepage hero subheadline                              |
| `YOUR_TAG_LINE`          | Small uppercase tag above each hero slide              |
| `YOUR_NAME`              | Author name (`package.json`, `LICENSE`)                |
| `your@email.com`         | Author email                                           |
| `yourdomain.com`         | Your production domain                                 |
| `YOUR_USERNAME`          | Your GitHub username (`package.json`)                  |
| `YOUR_REPO_NAME`         | Your repo name (`package.json`)                        |
| `YOUR_LICENSE`, `YOUR_LICENSE_TYPE`, `YOUR_YEAR` | License & copyright year (`LICENSE`, `README.md`) |
| `YOUR_PROJECT_ID`, `YOUR_PROJECT_REF`            | Supabase project ID / ref (env only) |
| `YOUR_SUPABASE_ANON_KEY`, `YOUR_SUPABASE_SERVICE_ROLE_KEY` | Supabase keys |
| `YOUR_RESEND_API_KEY`    | Resend transactional-email API key                     |

## 2. Assets (see `public/ASSETS_GUIDE.md` for sizes)

- [ ] `/public/favicon.ico`
- [ ] `/public/apple-touch-icon.png` (180×180)
- [ ] `/public/icon-192.png` and `/public/icon-512.png` (PWA)
- [ ] `/public/logo.png` (header / about page)
- [ ] `/public/og-image.png` (1200×630 social preview)
- [ ] `/public/hero-slide-1.png`, `hero-slide-2.png`, `hero-slide-3.png` (1920×1080 homepage slider)
- [ ] `/public/page-hero-1.png` … `/public/page-hero-5.png` (1920×600 section banners)
- [ ] Generate everything via <https://realfavicongenerator.net> for guaranteed coverage
- [ ] Optionally run `npm run images:compress` after adding new assets

## 3. Environment configuration

- [ ] Copy `.env.example` → `.env.local` and fill in every value
- [ ] Set `NEXT_PUBLIC_APP_URL` to your canonical production URL
- [ ] Set `NEXT_PUBLIC_WORDMARK`, `NEXT_PUBLIC_SITE_NAME`, `NEXT_PUBLIC_SITE_TAGLINE`
- [ ] Set `NEXT_PUBLIC_CONTACT_EMAIL`, `NEXT_PUBLIC_CONTACT_PHONE`, `NEXT_PUBLIC_CONTACT_WHATSAPP`, `NEXT_PUBLIC_CONTACT_ADDRESS`
- [ ] (Optional) Set `NEXT_PUBLIC_SOCIAL_INSTAGRAM` / `_YOUTUBE` / `_SNAPCHAT` etc. — empty hides the icons
- [ ] Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_PROJECT_REF`
- [ ] Set Moolre keys: `MOOLRE_API_KEY`, `MOOLRE_API_USER`, `MOOLRE_API_PUBKEY`, `MOOLRE_ACCOUNT_NUMBER`, `MOOLRE_SMS_API_KEY`, `MOOLRE_CALLBACK_SECRET`
- [ ] Set Resend keys: `RESEND_API_KEY`, `ADMIN_EMAIL`, `EMAIL_FROM`
- [ ] (Optional) Set `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` + `RECAPTCHA_SECRET_KEY`
- [ ] Set `CRON_SECRET` for the `/api/cron/payment-reminders` route

## 4. Manifests & package metadata

- [ ] `package.json` — update `name`, `description`, `author`, `homepage`, `repository`, `bugs`, `keywords`
- [ ] `public/manifest.json` — set `name`, `short_name`, `description`, `theme_color`, icon paths
- [ ] `app/layout.tsx` — confirm theme color `#2563eb` matches your brand; replace if needed
- [ ] `tailwind.config.js` — add any brand color tokens you need

## 5. Database (Supabase)

- [ ] Create a new Supabase project
- [ ] Run migrations: `npm run db:migrate` (or follow `supabase/README.md`)
- [ ] Enable Row Level Security: `node scripts/apply-rls.mjs` or paste `scripts/enable-rls.sql` into the Supabase SQL editor
- [ ] Create your first admin user: `npm run create-admin`

## 6. Legal

- [ ] Replace `LICENSE` with the full text of your chosen license (MIT, Apache-2.0, proprietary, etc.) and set `license` in `package.json`
- [ ] Review `app/(store)/privacy/page.tsx` and `app/(store)/terms/page.tsx` — they pull copy from CMS / env, but read them in browser and adjust the static fallback text to your jurisdiction

## 7. SEO

- [ ] Update `public/robots.txt` if your route layout differs (default already neutral)
- [ ] `app/sitemap.ts` and `app/robots.ts` already use `NEXT_PUBLIC_APP_URL` — no edits needed once env is set
- [ ] Add your own `/public/og-image.png` (Phase 2 of `public/ASSETS_GUIDE.md`)
- [ ] Set `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` once you register the property in Google Search Console

## 8. Deployment

- [ ] Push the repo to GitHub under your account (see Section 1 placeholders for `package.json` repo fields)
- [ ] Connect to Vercel as a **new** project; `vercel.json` already pins the framework to `nextjs`
- [ ] In Vercel → Settings → Environment Variables, mirror every key from your `.env.local`
- [ ] Verify the cron in `vercel.json` (`/api/cron/payment-reminders` daily at 09:00) — change schedule if needed
- [ ] Configure your custom domain in Vercel and update DNS

## 9. Smoke-test before launch

- [ ] `npm install`
- [ ] `npm run dev` — confirm homepage, shop, cart, checkout, admin login all render and the wordmark shows your brand
- [ ] `npm run build` — must compile cleanly
- [ ] Place a test order in production, confirm Moolre payment, confirm email + SMS delivery
- [ ] Verify PWA install on a phone (manifest icons + service worker)
- [ ] Verify favicon + OG preview using <https://www.opengraph.xyz>
