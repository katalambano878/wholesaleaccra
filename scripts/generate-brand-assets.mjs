/**
 * Generate every brand image variant from a single source logo.
 *
 *   Source:  scripts/brand-assets/logo-source.png  (transparent PNG)
 *   Outputs: public/logo.png, icon-192.png, icon-512.png, apple-touch-icon.png,
 *            favicon.ico (32x32 PNG bytes — accepted by every modern browser),
 *            og-image.png (1200x630 with logo centered on brand background)
 *
 * Run with: npm run assets:generate
 *
 * Drop a replacement logo at scripts/brand-assets/logo-source.png and re-run
 * to refresh every variant from a single edit.
 */

import sharp from 'sharp';
import path from 'node:path';
import fs from 'node:fs/promises';

const PUBLIC = path.resolve('public');
const SRC = path.resolve('scripts', 'brand-assets', 'logo-source.png');

// Brand background for the OG card (subtle gradient base — solid pink-purple)
const OG_BG = { r: 156, g: 39, b: 176, alpha: 1 }; // matches the magenta in the logo

async function exists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

async function main() {
  if (!(await exists(SRC))) {
    console.error(`ERROR: source logo not found at ${SRC}`);
    process.exit(1);
  }

  const srcMeta = await sharp(SRC).metadata();
  console.log(`Source: ${srcMeta.width}x${srcMeta.height} ${srcMeta.format} (alpha: ${srcMeta.hasAlpha})`);

  // 1. Main logo — keep aspect, max 800px on the long edge
  await sharp(SRC)
    .resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: false })
    .png({ compressionLevel: 9 })
    .toFile(path.join(PUBLIC, 'logo.png'));
  console.log('  ✓ logo.png');

  // Helper: square icon with the logo contained, transparent background.
  // Adds a small ~6% margin so the logo doesn't kiss the edges.
  const squareIcon = async (size, outName) => {
    const inner = Math.round(size * 0.88);
    const resized = await sharp(SRC)
      .resize({ width: inner, height: inner, fit: 'inside' })
      .toBuffer();
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: resized, gravity: 'center' }])
      .png({ compressionLevel: 9 })
      .toFile(path.join(PUBLIC, outName));
    console.log(`  ✓ ${outName}`);
  };

  await squareIcon(192, 'icon-192.png');
  await squareIcon(512, 'icon-512.png');
  await squareIcon(180, 'apple-touch-icon.png');

  // 2. Favicon — 32×32 PNG bytes saved as .ico (modern-browser compatible).
  //    For maximum legacy compatibility you can later run a dedicated ICO
  //    encoder; the PNG-in-ICO trick covers >99% of real-world traffic.
  await squareIcon(32, 'favicon.ico');

  // 3. Open Graph card — 1200×630, logo centered on brand background.
  const ogInner = await sharp(SRC)
    .resize({ width: 520, height: 520, fit: 'inside' })
    .toBuffer();
  await sharp({
    create: {
      width: 1200,
      height: 630,
      channels: 4,
      background: OG_BG,
    },
  })
    .composite([{ input: ogInner, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(PUBLIC, 'og-image.png'));
  console.log('  ✓ og-image.png');

  // 4. Hero-slider placeholders (1920×1080) — brand-coloured backdrops with
  //    a subtle centered logo. Replace these with real product photos when
  //    available; keep the same filenames and the slider picks them up.
  const heroSlides = [
    { file: 'hero-slide-1.png', bg: { r: 156, g: 39, b: 176, alpha: 1 } }, // magenta
    { file: 'hero-slide-2.png', bg: { r: 91, g: 33, b: 182, alpha: 1 } },  // deep purple
    { file: 'hero-slide-3.png', bg: { r: 190, g: 24, b: 93, alpha: 1 } },  // wine pink
  ];

  const heroLogoBuf = await sharp(SRC)
    .resize({ width: 700, height: 700, fit: 'inside' })
    .toBuffer();

  for (const slide of heroSlides) {
    await sharp({
      create: { width: 1920, height: 1080, channels: 4, background: slide.bg },
    })
      .composite([{ input: heroLogoBuf, gravity: 'center' }])
      .png({ compressionLevel: 9 })
      .toFile(path.join(PUBLIC, slide.file));
    console.log(`  ✓ ${slide.file}`);
  }

  // 5. Page-hero banners (1920×600) — same idea, used on About / Shop /
  //    Contact / Blog / Categories etc.
  const pageHeroes = [
    { file: 'page-hero-1.png', bg: { r: 156, g: 39, b: 176, alpha: 1 } },
    { file: 'page-hero-2.png', bg: { r: 91, g: 33, b: 182, alpha: 1 } },
    { file: 'page-hero-3.png', bg: { r: 190, g: 24, b: 93, alpha: 1 } },
    { file: 'page-hero-4.png', bg: { r: 124, g: 58, b: 237, alpha: 1 } },
    { file: 'page-hero-5.png', bg: { r: 219, g: 39, b: 119, alpha: 1 } },
  ];

  const pageLogoBuf = await sharp(SRC)
    .resize({ width: 380, height: 380, fit: 'inside' })
    .toBuffer();

  for (const banner of pageHeroes) {
    await sharp({
      create: { width: 1920, height: 600, channels: 4, background: banner.bg },
    })
      .composite([{ input: pageLogoBuf, gravity: 'center' }])
      .png({ compressionLevel: 9 })
      .toFile(path.join(PUBLIC, banner.file));
    console.log(`  ✓ ${banner.file}`);
  }

  console.log('\nAll brand assets generated in /public.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
