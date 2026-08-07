import type { DB } from './db/index.js';
import { effectiveSettings, effectiveDishes, effectiveReviews, effectiveGallery, effectiveHours } from './lib/publish.js';

/**
 * Public content loader — reads the PUBLISHED state only.
 * The public website never sees drafts.
 */

export interface Dish {
  id: number;
  type: 'signature' | 'bestseller';
  name: string;
  description: string;
  price: string | null;
  category: string | null;
  badge: string | null;
  image_url: string | null;
  is_featured: number;
  sort_order: number;
}

export interface Review {
  id: number;
  name: string;
  text: string;
  rating: number;
  image_url: string | null;
  sort_order: number;
}

export interface GalleryItem {
  id: number;
  image_url: string;
  alt: string;
  is_featured: number;
  sort_order: number;
}

export interface HourRow {
  day_index: number;
  day_name: string;
  is_open: number;
  open_time: string | null;
  close_time: string | null;
}

export interface MenuGroup {
  category: string;
  sub: string;
  dishes: Dish[];
}

export type Settings = Record<string, string>;

const BS_CAT_MAP: Record<string, string> = {
  Platters: 'platters',
  'Snacks & Pizza': 'snacks',
  'Cocktails & Hookah': 'drinks',
};

export function loadSettings(db: DB): Settings {
  const rows = db.prepare('SELECT key, value FROM settings WHERE key != ?').all('system.revisionPointer') as { key: string; value: string | null }[];
  const out: Settings = {};
  for (const r of rows) if (r.value != null) out[r.key] = r.value;
  return out;
}

export function loadDishes(db: DB, type?: 'signature' | 'bestseller'): Dish[] {
  const rows = db
    .prepare(
      `SELECT id, type, name, description, price, category, badge, image_url, is_featured, sort_order
       FROM dishes WHERE is_visible = 1 ${type ? 'AND type = ?' : ''}
       ORDER BY sort_order ASC, id ASC`
    )
    .all(type ? [type] : []) as Dish[];
  return dishesFromRows(rows);
}

export function dishesFromRows(rows: unknown[]): Dish[] {
  return (rows as Dish[])
    .filter((r) => (r as { is_visible?: number }).is_visible !== 0)
    .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
}

export function loadReviews(db: DB): Review[] {
  const rows = db
    .prepare(
      `SELECT id, name, text, rating, image_url, sort_order
       FROM reviews WHERE is_visible = 1 ORDER BY sort_order ASC, id ASC`
    )
    .all() as Review[];
  return reviewsFromRows(rows);
}

export function reviewsFromRows(rows: unknown[]): Review[] {
  return (rows as Review[])
    .filter((r) => (r as { is_visible?: number }).is_visible !== 0)
    .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
}

export function loadGallery(db: DB): GalleryItem[] {
  const rows = db
    .prepare(
      `SELECT id, image_url, alt, is_featured, sort_order
       FROM gallery WHERE is_visible = 1 ORDER BY sort_order ASC, id ASC`
    )
    .all() as GalleryItem[];
  return galleryFromRows(rows);
}

export function galleryFromRows(rows: unknown[]): GalleryItem[] {
  return (rows as GalleryItem[])
    .filter((r) => (r as { is_visible?: number }).is_visible !== 0)
    .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
}

export function loadHours(db: DB): HourRow[] {
  const rows = db.prepare('SELECT * FROM opening_hours ORDER BY day_index ASC').all() as HourRow[];
  return hoursFromRows(rows);
}

export function hoursFromRows(rows: unknown[]): HourRow[] {
  return (rows as HourRow[]).sort((a, b) => a.day_index - b.day_index);
}

/* ---------------- Formatting helpers ---------------- */

export function digitsOnly(v: string | null | undefined): string {
  return (v ?? '').replace(/[^\d]/g, '');
}

export function telHref(phone: string): string {
  const d = digitsOnly(phone);
  return d ? `tel:${d}` : '#';
}

export function waHref(phone: string, text: string): string {
  const d = digitsOnly(phone);
  return `https://wa.me/${d}?text=${encodeURIComponent(text)}`;
}

export function fmt12(t: string | null | undefined): string {
  if (!t) return '';
  const m = t.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return t;
  const h = Number(m[1]);
  const mm = m[2];
  const ap = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${mm} ${ap}`;
}

export function shortAddress(address: string): string {
  const parts = address.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 3) return `${parts[0]}, ${parts[1]} · ${parts[2]}`;
  return address;
}

export function hoursSummary(hours: HourRow[]): string {
  const open = hours.filter((h) => h.is_open);
  if (open.length === 0) return 'Closed';
  const pairs = new Set(open.map((h) => `${h.open_time}-${h.close_time}`));
  const first = open[0];
  if (open.length === 7 && pairs.size === 1) {
    return `Monday – Sunday · ${fmt12(first.open_time)} – ${fmt12(first.close_time)}`;
  }
  if (pairs.size === 1) {
    return `Open daily · ${fmt12(first.open_time)} – ${fmt12(first.close_time)}`;
  }
  return 'Open daily · hours vary by day';
}

export function hoursMeta(hours: HourRow[]): string {
  const open = hours.filter((h) => h.is_open);
  if (open.length === 0) return 'Closed today';
  const pairs = new Set(open.map((h) => `${h.open_time}-${h.close_time}`));
  const first = open[0];
  if (pairs.size === 1) return `Open Daily ${fmt12(first.open_time)} – ${fmt12(first.close_time)}`;
  return 'Open Daily';
}

/** Upgrades unsplash-style thumb URLs to a larger size (for lightbox / hero). */
export function fullImage(url: string | null): string {
  if (!url) return '';
  if (/auto=format&fit=crop&w=900&q=75/.test(url)) {
    return url.replace('auto=format&fit=crop&w=900&q=75', 'auto=format&fit=crop&w=1600&q=80');
  }
  return url;
}

/** Normalises a video setting into an embeddable iframe URL. */
export function embedVideo(url: string | null, autoplay = false): string {
  if (!url) return '';
  let u = url.trim();
  const ytId = (src: string) => {
    const m = src.match(/youtu\.be\/([\w-]{6,})/) || src.match(/youtube\.com\/(?:embed|watch|shorts)\/([\w-]{6,})/) || src.match(/[?&]v=([\w-]{6,})/);
    return m ? m[1] : null;
  };
  const id = ytId(u);
  if (id) u = `https://www.youtube.com/embed/${id}`;
  const sep = u.includes('?') ? '&' : '?';
  return autoplay ? `${u}${sep}autoplay=1&rel=0` : u;
}

export interface PublicContent {
  settings: Settings;
  s: (k: string, fallback?: string) => string;
  dishes: Dish[];
  signature: Dish[];
  bestsellers: Dish[];
  menuGroups: MenuGroup[];
  reviews: Review[];
  gallery: GalleryItem[];
  galleryFull: GalleryItem[];
  galleryItems: { thumb: string; full: string; alt: string; is_featured: number }[];
  hours: HourRow[];
  heroSlides: { image: string }[];
  phone: { tel: string; display: string };
  whatsapp: { wa: string; href: string; hrefText: string };
  orderLink: (name: string, price: string) => string;
  email: string;
  address: string;
  mapsUrl: string;
  socials: { facebook: string; instagram: string; tiktok: string; youtube: string };
  videoShowcase: string;
  videoModal: string;
  hoursLabel: string;
  hoursMetaLabel: string;
  meta1: string;
  year: number;
  i18nOverrides: Record<string, string>;
  bestsellersJson: string;
  contactJson: string;
  videoJson: string;
  i18nJson: string;
}

/** Shared page locals used by the public templates (home + menu + preview). */
export function pageLocals(view: 'index' | 'menu', c: PublicContent, extra: Record<string, unknown> = {}) {
  const requestHost = String(extra.requestHost ?? '');
  const canonicalPath = view === 'menu' ? '/menu.html' : '/';
  return {
    ...c,
    title:
      view === 'menu'
        ? `${c.s('restaurant.name')} | Full Digital Menu`
        : `${c.s('restaurant.name')} | ${c.s('restaurant.cuisine')}, ${c.s('contact.city')}`,
    description:
      view === 'menu'
        ? `${c.s('restaurant.name')} full digital menu — group platters, snacks & pizza, cocktails & hookah. Live prices. Order on WhatsApp or reserve your table in ${c.s('contact.city')}.`
        : `${c.s('restaurant.name')} in ${c.address} — ${c.s('restaurant.tagline')} Reserve your table today.`,
    pageCss: view === 'menu' ? '<link rel="stylesheet" href="css/menu.css?v=' + (extra.assetsV ?? 1) + '" />' : '',
    canonical: requestHost ? `https://${requestHost}${canonicalPath}` : '',
    ...extra,
    preview: extra.preview ?? false,
  };
}

export function buildMenuGroups(bestsellers: Dish[]): MenuGroup[] {
  const order = ['Platters', 'Snacks & Pizza', 'Cocktails & Hookah'];
  const subs: Record<string, string> = {
    Platters: 'Made for sharing, built to impress — the dishes Hetauda asks for by name.',
    'Snacks & Pizza': 'Wood-fired, loaded and impossible to share quietly.',
    'Cocktails & Hookah': 'Lounge nights start here — shaken to order, smoked to perfection.',
  };
  const groups: MenuGroup[] = [];
  for (const cat of order) {
    const dishes = bestsellers.filter((d) => d.category === cat);
    if (dishes.length) groups.push({ category: cat, sub: subs[cat] ?? '', dishes });
  }
  const others = bestsellers.filter((d) => d.category && !order.includes(d.category));
  if (others.length) {
    groups.push({ category: others[0].category ?? 'More', sub: '', dishes: others });
  }
  return groups;
}

export function buildPublicContent(db: DB, opts: { draft?: boolean } = {}): PublicContent {
  const draft = opts.draft ?? false;

  let settingsRaw: Record<string, string | null>;
  let dishesRaw: Record<string, unknown>[];
  let reviewsRaw: Record<string, unknown>[];
  let galleryRaw: Record<string, unknown>[];
  let hoursRaw: Record<string, unknown>[];

  if (draft) {
    settingsRaw = effectiveSettings(db);
    dishesRaw = effectiveDishes(db);
    reviewsRaw = effectiveReviews(db);
    galleryRaw = effectiveGallery(db);
    hoursRaw = effectiveHours(db);
  } else {
    settingsRaw = {};
    for (const [k, v] of Object.entries(loadSettings(db))) settingsRaw[k] = v;
    dishesRaw = db
      .prepare('SELECT * FROM dishes')
      .all() as Record<string, unknown>[];
    reviewsRaw = db.prepare('SELECT * FROM reviews').all() as Record<string, unknown>[];
    galleryRaw = db.prepare('SELECT * FROM gallery').all() as Record<string, unknown>[];
    hoursRaw = db.prepare('SELECT * FROM opening_hours').all() as Record<string, unknown>[];
  }

  const settings = Object.fromEntries(
    Object.entries(settingsRaw).filter(([, v]) => v != null)
  ) as Settings;
  const s = (k: string, fallback = ''): string => settings[k] ?? fallback;

  const dishes = dishesFromRows(dishesRaw);
  const signature = dishes.filter((d) => d.type === 'signature');
  const bestsellers = dishes.filter((d) => d.type === 'bestseller');
  const reviews = reviewsFromRows(reviewsRaw);
  const gallery = galleryFromRows(galleryRaw);
  const hours = hoursFromRows(hoursRaw);

  const phoneRaw = s('contact.phone');
  const waRaw = s('contact.whatsapp', digitsOnly(phoneRaw));
  const address = s('contact.address');
  const mapsUrl = s('contact.maps_url');

  const galleryFull = gallery.map((g) => ({ ...g, image_url: fullImage(g.image_url) }));
  const galleryItems = gallery.map((g, i) => ({
    thumb: g.image_url,
    full: galleryFull[i].image_url,
    alt: g.alt,
    is_featured: g.is_featured,
  }));

  const heroSlides: { image: string }[] = [];
  const heroImage = s('hero.image');
  if (heroImage) heroSlides.push({ image: heroImage });
  for (const g of galleryFull.slice(0, 2)) heroSlides.push({ image: g.image_url });
  while (heroSlides.length < 3) {
    heroSlides.push({
      image:
        'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1920&q=80',
    });
  }

  const hoursLabel = hoursSummary(hours);
  const hoursMetaLabel = hoursMeta(hours);
  const meta1 = shortAddress(address);

  const i18nOverrides: Record<string, string> = {
    'hero.eyebrow': s('restaurant.cuisine'),
    'hero.title': s('hero.heading'),
    'hero.sub': s('hero.subheading'),
    'hero.meta1': meta1,
    'hero.meta2': hoursMetaLabel,
    'about.lead': s('restaurant.description'),
    'about.body': s('restaurant.about'),
    'about.badge': 'Days a week · open 11 AM – 11 PM',
    'visit.addr': address,
    'visit.hours': hoursLabel,
    'footer.tag': `${s('restaurant.cuisine')}. ${s('restaurant.tagline')}.`,
    'footer.addr': address,
    'footer.hoursLine': hoursLabel.replace('Monday – Sunday', 'Mon – Sun'),
    'contact.alt': `Prefer to talk? Call <a href="${telHref(phoneRaw)}">${phoneRaw}</a> — we answer every call.`,
  };

  const bs = bestsellers.map((d) => ({
    name: d.name,
    price: d.price ?? '',
    cat: BS_CAT_MAP[d.category ?? ''] ?? 'other',
    catLabel: d.category ?? '',
    badge: d.badge ?? null,
    desc: d.description,
    img: d.image_url ?? '',
  }));

  const videoShowcase = embedVideo(s('hero.video'));
  const videoModal = embedVideo(s('hero.video'), true);

  const jsonSafe = (v: unknown) => JSON.stringify(v).replace(/</g, '\\u003c');

  return {
    settings,
    s,
    dishes,
    signature,
    bestsellers,
    menuGroups: buildMenuGroups(bestsellers),
    reviews,
    gallery,
    galleryFull,
    galleryItems,
    hours,
    heroSlides,
    phone: { tel: telHref(phoneRaw), display: phoneRaw },
    whatsapp: {
      wa: digitsOnly(waRaw),
      href: `https://wa.me/${digitsOnly(waRaw)}`,
      hrefText: `https://wa.me/${digitsOnly(waRaw)}?text=${encodeURIComponent('Hi Sutra Lounge!')}`,
    },
    orderLink: (name: string, price: string) =>
      waHref(waRaw, `Hi Sutra Lounge! I would like to order the ${name} (${price}).`),
    email: s('contact.email'),
    address,
    mapsUrl,
    socials: {
      facebook: s('social.facebook'),
      instagram: s('social.instagram'),
      tiktok: s('social.tiktok'),
      youtube: s('social.youtube'),
    },
    videoShowcase,
    videoModal,
    hoursLabel,
    hoursMetaLabel,
    meta1,
    year: new Date().getFullYear(),
    i18nOverrides,
    bestsellersJson: jsonSafe(bs),
    contactJson: jsonSafe({ wa: digitsOnly(waRaw), phone: phoneRaw, email: s('contact.email') }),
    videoJson: jsonSafe({ modal: videoModal }),
    i18nJson: jsonSafe(i18nOverrides),
  };
}
