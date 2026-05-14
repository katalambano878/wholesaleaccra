/**
 * Neutral site defaults. Set NEXT_PUBLIC_* env vars and/or CMS settings for production.
 *
 * IMPORTANT — every env read below MUST be a static `process.env.NEXT_PUBLIC_X`
 * reference. Next.js (via webpack DefinePlugin) inlines those at build time so
 * the same value lands on the server and the client. A dynamic `process.env[key]`
 * is NOT inlined on the client — that returns `undefined` in the browser and
 * causes hydration mismatches (server renders one thing, client another).
 */

const norm = (v: string | undefined): string =>
  typeof v === 'string' ? v.trim() : '';

/** Text logo / wordmark (header, footer, PWA) */
export function getWordmark(): string {
  return norm(process.env.NEXT_PUBLIC_WORDMARK) || 'Accra Wholesale';
}

/** Display name (store / site title) */
export function getSiteName(): string {
  return norm(process.env.NEXT_PUBLIC_SITE_NAME) || 'Accra Wholesale Clothing';
}

/** Short line for meta / hero */
export function getSiteTagline(): string {
  return norm(process.env.NEXT_PUBLIC_SITE_TAGLINE) || 'Online store';
}

export function getContactEmail(): string {
  return norm(process.env.NEXT_PUBLIC_CONTACT_EMAIL) || 'contact@example.com';
}

/** Human-readable phone for display */
export function getContactPhoneDisplay(): string {
  return norm(process.env.NEXT_PUBLIC_CONTACT_PHONE);
}

/** E.164-style for tel: / SMS (best effort from display or raw env) */
export function getContactPhoneTel(): string {
  const raw =
    norm(process.env.NEXT_PUBLIC_CONTACT_PHONE_TEL) ||
    norm(process.env.NEXT_PUBLIC_CONTACT_PHONE);
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  if (raw.includes('+')) return '+' + digits.replace(/^\+/, '');
  if (digits.startsWith('0') && digits.length >= 9) return `+233${digits.slice(1)}`;
  return digits.length >= 10 ? `+${digits}` : digits;
}

export function getContactAddress(): string {
  return norm(process.env.NEXT_PUBLIC_CONTACT_ADDRESS);
}

/** Strip placeholder / empty so "[Your address]" never shows in UI */
export function sanitizeAddressDisplay(addr: string | undefined | null): string {
  const t = (addr ?? '').trim();
  if (!t || /^\[Your address\]$/i.test(t)) return '';
  return t;
}

/**
 * Default social links. Empty by default; provide handles via NEXT_PUBLIC_SOCIAL_*
 * env vars or the CMS. Unset links are not rendered in the footer.
 */
export function getDefaultSocialLinks() {
  return {
    instagram: norm(process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM),
    tiktok: norm(process.env.NEXT_PUBLIC_SOCIAL_TIKTOK),
    youtube: norm(process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE),
    snapchat: norm(process.env.NEXT_PUBLIC_SOCIAL_SNAPCHAT),
    facebook: norm(process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK),
    twitter: norm(process.env.NEXT_PUBLIC_SOCIAL_TWITTER),
  };
}

export function getSocialInstagramHandle(): string {
  return norm(process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM_HANDLE);
}

export function getSocialTiktokHandle(): string {
  return norm(process.env.NEXT_PUBLIC_SOCIAL_TIKTOK_HANDLE);
}

export function getSocialYoutubeHandle(): string {
  return norm(process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE_HANDLE);
}

export function getSocialSnapchatHandle(): string {
  return norm(process.env.NEXT_PUBLIC_SOCIAL_SNAPCHAT_HANDLE);
}

export function getDefaultMetaDescription(): string {
  const tag = getSiteTagline();
  const addr = getContactAddress();
  if (addr) return `${tag}. ${addr}.`;
  return `${tag}. Shop online.`;
}

export function getDefaultTitleSuffix(): string {
  return `${getSiteName()} | ${getSiteTagline()}`;
}

/** Moolre / SMS sender id (max length per provider) */
export function getSmsSenderId(): string {
  const id = (norm(process.env.NEXT_PUBLIC_SMS_SENDER_ID) || 'STORE').toUpperCase();
  return id.slice(0, 11);
}

/** Auto-generated product SKU prefix */
export function getSkuPrefix(): string {
  return (norm(process.env.NEXT_PUBLIC_SKU_PREFIX) || 'SKU')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8) || 'SKU';
}

/** Server: admin / notification email fallback. NOT inlined on the client. */
export function getServerAdminEmail(): string {
  return norm(process.env.ADMIN_EMAIL) || getContactEmail();
}

export function getServerEmailFrom(): string {
  const explicit = norm(process.env.EMAIL_FROM);
  if (explicit) return explicit;
  const name = getSiteName();
  const email = getServerAdminEmail();
  return `${name} <${email}>`;
}
