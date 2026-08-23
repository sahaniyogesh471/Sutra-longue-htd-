import { DB, initSchema, getDb, setBaselineSetting, setSetting, runInTransaction, prepareNamed } from './index.js';
import { DISH_NP, REVIEW_NP } from './translations.js';

/**
 * ORIGINAL BASELINE — the protected Sutra Lounge content.
 *
 * Seed runs only when a table is empty (idempotent). The same data is
 * written to both the CURRENT tables and the BASELINE tables so that:
 *   - normal admin edits mutate only the CURRENT state,
 *   - the ORIGINAL baseline is never overwritten,
 *   - "Restore Original" / "Reset Entire Website" copy baseline -> current.
 *
 * NOTE: Review seed rows are DEMO content (clearly identifiable), ready to be
 * replaced or removed from the admin panel. They are not real customer reviews.
 */

export type SeedOptions = { force?: boolean };

interface DishSeed {
  type: 'signature' | 'bestseller';
  name: string;
  description: string;
  price?: string;
  category?: string;
  badge?: string;
  image_url: string;
  is_featured?: number;
  sort_order: number;
}

const DISHES: DishSeed[] = [
  // ---- Signature dishes (homepage, price-free, "Reserve to Taste") ----
  {
    type: 'signature', name: 'Sutra Fusion Mo:Mo Platter',
    description: 'Hand-folded Nepali momos reinvented — steamed, pan-fried and tossed in our signature Sutra glaze, served with three house dips.',
    category: 'Nepali', badge: 'Most Loved', sort_order: 1,
    image_url: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=800&q=80',
    is_featured: 1,
  },
  {
    type: 'signature', name: 'Crispy Chilli Chicken & Sizzlers',
    description: 'Crackling-crisp chilli chicken and flame-kissed sizzlers, brought to your table smoking hot on a cast-iron plate.',
    category: 'Chinese', badge: 'Crowd Favourite', sort_order: 2,
    image_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
  },
  {
    type: 'signature', name: 'Artisan Clay-Oven Pizzas',
    description: 'Hand-tossed dough, slow-simmered tomato sauce and blistered char from our clay oven — street-crisp, never floppy.',
    category: 'Continental', badge: 'Wood-Fired', sort_order: 3,
    image_url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80',
  },
  {
    type: 'signature', name: 'Custom Handcrafted Mocktails & Cocktails',
    description: 'Bespoke bar creations muddled fresh and shaken to order — zero-proof signatures for families, premium pours after dark.',
    category: 'Beverages', badge: 'Bar Craft', sort_order: 4,
    image_url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=80',
  },

  // ---- Bestsellers (homepage bestsellers + Full Digital Menu) ----
  {
    type: 'bestseller', name: 'Bamboo Biryani', price: 'Rs 545',
    description: 'Slow-cooked in real bamboo with aromatic Nepali spices.',
    category: 'Platters', badge: 'Chef Special', sort_order: 1,
    image_url: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=800&q=80',
    is_featured: 1,
  },
  {
    type: 'bestseller', name: 'Sutra Momo Platter', price: 'Rs 495',
    description: '15-piece combo of Steam, Fry, Kothey, Chilly & Crunchy Mo:mo.',
    category: 'Platters', badge: 'Must Try', sort_order: 2,
    image_url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80',
  },
  {
    type: 'bestseller', name: 'Grand Indian Platter', price: 'Rs 1,495',
    description: 'Tandoori chicken, seekh kebab, butter chicken, naan & pulao.',
    category: 'Platters', badge: 'Group Size', sort_order: 3,
    image_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
  },
  {
    type: 'bestseller', name: 'Peri Peri Chicken Pizza', price: 'Rs 795',
    description: 'Loaded with spicy peri-peri chicken, melted mozzarella, and fresh veggies.',
    category: 'Snacks & Pizza', sort_order: 4,
    image_url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80',
  },
  {
    type: 'bestseller', name: 'Monster Fries', price: 'Rs 495',
    description: 'Loaded crispy fries topped with melted cheese and signature spicy sauces.',
    category: 'Snacks & Pizza', sort_order: 5,
    image_url: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=800&q=80',
  },
  {
    type: 'bestseller', name: 'Creamy Espresso Martini', price: 'Rs 995',
    description: 'Fresh espresso shot blended with dark spirit and smooth cream.',
    category: 'Cocktails & Hookah', badge: 'Signature Drink', sort_order: 6,
    image_url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=80',
  },
  {
    type: 'bestseller', name: 'Cloud Hookah', price: 'Rs 495',
    description: 'Premium smooth smoke available in exotic fruit flavors.',
    category: 'Cocktails & Hookah', badge: 'Lounge Favorite', sort_order: 7,
    image_url: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=800&q=80',
  },
];

/** key -> value for both CURRENT and BASELINE settings. */
const SETTINGS: Record<string, string> = {
  'restaurant.name': 'Sutra Lounge',
  'restaurant.cuisine': 'Premium Multi-Cuisine Resto-Lounge & Bar',
  'restaurant.tagline': 'Sumptuous Food. Great Music. Unforgettable Times.',
  'restaurant.description':
    "Hupra's premier dining destination in Hetauda — handcrafted multi-cuisine dishes, wood-fired flavour, hand-mixed cocktails and a lounge soundtrack that keeps the night alive.",
  'restaurant.about':
    'Sutra Lounge was born from a simple belief — that great evenings are built on three things: sumptuous food, great music and unforgettable times. Set in the heart of Hupra, our kitchen blends Nepali soul with international craft. Momos are folded by hand each morning, dough is stretched for the clay oven every afternoon, and the bar shakes to order through the night. Whether it is a family dinner, a celebration or a quiet date, our lounge is designed to make the moment last.',
  'hero.heading': 'Sumptuous Food. Great Music. Unforgettable Times.',
  'hero.subheading':
    "Hupra's premier dining destination in Hetauda — handcrafted multi-cuisine dishes, wood-fired flavour, hand-mixed cocktails and a lounge soundtrack that keeps the night alive.",
  'hero.image':
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1920&q=80',
  'hero.video': 'https://www.youtube.com/embed/2sRGneKpy_k?rel=0',
  'contact.phone': '057-522111',
  'contact.whatsapp': '97757522111',
  'contact.email': 'sutralonguehtd@gmail.com',
  'contact.address': 'Hupra, Hetauda-4, Makwanpur, Nepal',
  'contact.city': 'Hetauda',
  'contact.maps_url': 'https://share.google/4oidZH9ykv71zNlzV',
  'social.facebook': 'https://www.facebook.com/SutraLounge/',
  'social.instagram': 'https://www.instagram.com/sutraloungehetauda/',
  'social.tiktok': 'https://www.tiktok.com/@sutralounge',
  'social.youtube': 'https://youtu.be/2sRGneKpy_k',
  'design.primary_color': '#c9a35c',
  // Brand logo shown in the header and footer. Blank falls back to the
  // bundled wordmark in img/.
  'design.logo': 'img/logo-gold.png',
};

/** Demo reviews — clearly identified, safe to replace/remove. */
const REVIEWS: { name: string; text: string; rating: number; image_url: string }[] = [
  {
    name: 'Yogesh Sahani',
    text: 'Really enjoyed my time at Sutra Lounge in Hetauda. The place has a really nice and comfortable vibe, and it’s a great spot to hang out with friends or family.\nThe food was tasty and nicely presented, and everything we ordered was enjoyable. I also liked the ambience and music—it made the whole experience feel relaxed and fun. The staff were friendly and the service was good too.\nOverall, I had a great experience at Sutra Lounge. Definitely a place I’d be happy to visit again when I’m in Hetauda. ❤️',
    rating: 5,
    image_url: 'img/review-yogesh.webp',
  },
  {
    name: 'Rabina Shrestha',
    text: 'The Sutra Fusion Mo:Mo Platter is unlike anything else in Hetauda. Warm service, great music, and an evening we are still talking about.',
    rating: 5,
    image_url: 'img/avatar-rs.jpg',
  },
  {
    name: 'Prakash Adhikari',
    text: "Best sizzlers in town, without a doubt. The clay-oven pizza tastes like it was flown in from Kathmandu's top kitchens.",
    rating: 5,
    image_url: 'img/avatar-pa.jpg',
  },
  {
    name: 'Sunita Gurung',
    text: 'Perfect for a family dinner or a date night. The staff treated us like guests, not customers — and the mocktails were superb.',
    rating: 5,
    image_url: 'img/avatar-sg.jpg',
  },
  {
    name: 'Aayush Shrestha',
    text: 'The lounge transforms into a proper party spot after dark. Great vibe, great drinks, and the crispy chilli chicken is addictive.',
    rating: 5,
    image_url: 'img/avatar-as.jpg',
  },
];

/** Demo gallery images (replaceable). */
const GALLERY: { image_url: string; alt: string; sort_order: number }[] = [
  { image_url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=75', alt: 'Assorted dishes served family style', sort_order: 1 },
  { image_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=75', alt: 'Warm interior of the lounge', sort_order: 2 },
  { image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=75', alt: 'Fresh, colourful signature bowl', sort_order: 3 },
  { image_url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=900&q=75', alt: 'Handcrafted mojito cocktail', sort_order: 4 },
  { image_url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=900&q=75', alt: 'Fine dining table setting', sort_order: 5 },
  { image_url: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=900&q=75', alt: 'Dessert plated with care', sort_order: 6 },
  { image_url: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=900&q=75', alt: 'Warm candlelit evening at the lounge', sort_order: 7 },
  { image_url: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=900&q=75', alt: 'A signature platter ready to serve', sort_order: 8 },
  // Served from the repo rather than data/uploads/ so it survives a redeploy
  // on hosts with an ephemeral filesystem.
  { image_url: 'img/gallery-yogesh.webp', alt: 'Developer Yogesh', sort_order: 9 },
];

const HOURS: { day_index: number; day_name: string; open_time: string; close_time: string }[] = [
  { day_index: 0, day_name: 'Monday', open_time: '08:00', close_time: '21:00' },
  { day_index: 1, day_name: 'Tuesday', open_time: '08:00', close_time: '21:00' },
  { day_index: 2, day_name: 'Wednesday', open_time: '08:00', close_time: '21:00' },
  { day_index: 3, day_name: 'Thursday', open_time: '08:00', close_time: '21:00' },
  { day_index: 4, day_name: 'Friday', open_time: '08:00', close_time: '21:00' },
  { day_index: 5, day_name: 'Saturday', open_time: '08:00', close_time: '21:00' },
  { day_index: 6, day_name: 'Sunday', open_time: '08:00', close_time: '21:00' },
];

function seedSettings(db: DB, force: boolean): boolean {
  const count = (db.prepare('SELECT COUNT(*) AS c FROM settings').get() as { c: number }).c;
  if (count > 0 && !force) return false;
  const upsertCurrent = db.prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  );
  const upsertBaseline = db.prepare(
    `INSERT INTO settings_baseline (key, value, captured_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  );
  for (const [key, value] of Object.entries(SETTINGS)) {
    upsertCurrent.run(key, value);
    upsertBaseline.run(key, value);
  }
  return true;
}

function seedDishes(db: DB, force: boolean): boolean {
  const count = (db.prepare('SELECT COUNT(*) AS c FROM dishes').get() as { c: number }).c;
  if (count > 0 && !force) return false;
  const insertCurrent = prepareNamed(db, 
    `INSERT INTO dishes (type, name, description, name_np, description_np, price, category, category_np, badge, badge_np, image_url, is_featured, is_visible, sort_order, created_at, updated_at)
     VALUES (@type, @name, @description, @name_np, @description_np, @price, @category, @category_np, @badge, @badge_np, @image_url, @is_featured, 1, @sort_order, datetime('now'), datetime('now'))`
  );
  const insertBaseline = prepareNamed(db, 
    `INSERT INTO dishes_baseline (baseline_ref, type, name, description, name_np, description_np, price, category, category_np, badge, badge_np, image_url, is_featured, sort_order, captured_at)
     VALUES (@id, @type, @name, @description, @name_np, @description_np, @price, @category, @category_np, @badge, @badge_np, @image_url, @is_featured, @sort_order, datetime('now'))`
  );
  runInTransaction(db, () => {
    for (const d of DISHES) {
      const np = DISH_NP[d.name] ?? { name_np: '', description_np: '', category_np: '', badge_np: '' };
      const row = {
        type: d.type, name: d.name, description: d.description,
        name_np: np.name_np, description_np: np.description_np,
        price: d.price ?? null, category: d.category ?? null, category_np: np.category_np,
        badge: d.badge ?? null, badge_np: np.badge_np,
        image_url: d.image_url, is_featured: d.is_featured ?? 0, sort_order: d.sort_order,
      };
      const info = insertCurrent.run(row);
      insertBaseline.run({ id: Number(info.lastInsertRowid), ...row });
    }
  });
  return true;
}

function seedReviews(db: DB, force: boolean): boolean {
  const count = (db.prepare('SELECT COUNT(*) AS c FROM reviews').get() as { c: number }).c;
  if (count > 0 && !force) return false;
  const insertCurrent = prepareNamed(db, 
    `INSERT INTO reviews (name, text, name_np, text_np, rating, image_url, is_visible, sort_order, created_at, updated_at)
     VALUES (@name, @text, @name_np, @text_np, @rating, @image_url, 1, @sort_order, datetime('now'), datetime('now'))`
  );
  const insertBaseline = prepareNamed(db, 
    `INSERT INTO reviews_baseline (baseline_ref, name, text, name_np, text_np, rating, image_url, sort_order, captured_at)
     VALUES (@id, @name, @text, @name_np, @text_np, @rating, @image_url, @sort_order, datetime('now'))`
  );
  runInTransaction(db, () => {
    REVIEWS.forEach((r, i) => {
      const np = REVIEW_NP[r.name] ?? { name_np: '', text_np: '' };
      const info = insertCurrent.run({ name: r.name, text: r.text, name_np: np.name_np, text_np: np.text_np, rating: r.rating, image_url: r.image_url, sort_order: i + 1 });
      insertBaseline.run({ id: Number(info.lastInsertRowid), name: r.name, text: r.text, name_np: np.name_np, text_np: np.text_np, rating: r.rating, image_url: r.image_url, sort_order: i + 1 });
    });
  });
  return true;
}

function seedGallery(db: DB, force: boolean): boolean {
  const count = (db.prepare('SELECT COUNT(*) AS c FROM gallery').get() as { c: number }).c;
  if (count > 0 && !force) return false;
  const insertCurrent = prepareNamed(db, 
    `INSERT INTO gallery (image_url, alt, is_featured, is_visible, sort_order, created_at, updated_at)
     VALUES (@image_url, @alt, @is_featured, 1, @sort_order, datetime('now'), datetime('now'))`
  );
  const insertBaseline = prepareNamed(db, 
    `INSERT INTO gallery_baseline (baseline_ref, image_url, alt, is_featured, sort_order, captured_at)
     VALUES (@id, @image_url, @alt, @is_featured, @sort_order, datetime('now'))`
  );
  runInTransaction(db, () => {
    GALLERY.forEach((g, i) => {
      const isFeatured = i === 0 ? 1 : 0;
      const info = insertCurrent.run({ image_url: g.image_url, alt: g.alt, is_featured: isFeatured, sort_order: g.sort_order });
      insertBaseline.run({ id: Number(info.lastInsertRowid), image_url: g.image_url, alt: g.alt, is_featured: isFeatured, sort_order: g.sort_order });
    });
  });
  return true;
}

function seedHours(db: DB, force: boolean): boolean {
  const count = (db.prepare('SELECT COUNT(*) AS c FROM opening_hours').get() as { c: number }).c;
  if (count > 0 && !force) return false;
  const upsertCurrent = prepareNamed(db, 
    `INSERT INTO opening_hours (day_index, day_name, is_open, open_time, close_time, updated_at)
     VALUES (@day_index, @day_name, 1, @open_time, @close_time, datetime('now'))
     ON CONFLICT(day_index) DO UPDATE SET day_name = excluded.day_name, open_time = excluded.open_time, close_time = excluded.close_time`
  );
  const upsertBaseline = prepareNamed(db, 
    `INSERT INTO opening_hours_baseline (day_index, day_name, is_open, open_time, close_time, captured_at)
     VALUES (@day_index, @day_name, 1, @open_time, @close_time, datetime('now'))
     ON CONFLICT(day_index) DO UPDATE SET day_name = excluded.day_name, open_time = excluded.open_time, close_time = excluded.close_time`
  );
  for (const h of HOURS) {
    upsertCurrent.run(h);
    upsertBaseline.run(h);
  }
  return true;
}

/** Seeds all baseline + current content. Idempotent unless `force` is set. */
export function seedAll(db: DB, opts: SeedOptions = {}): { seeded: boolean; tables: string[] } {
  initSchema(db);
  const seededTables: string[] = [];
  const mark = (table: string, seeded: boolean) => { if (seeded) seededTables.push(table); };

  // Each table is seeded independently so a database that is only partially
  // populated (for example when an earlier deploy failed midway) repairs the
  // missing tables instead of staying broken. A failure in one table must not
  // stop the others, otherwise a single error leaves the site with no settings,
  // reviews or opening hours.
  const step = (table: string, fn: () => boolean) => {
    try {
      mark(table, fn());
    } catch (err) {
      console.error(`[seed] Failed to seed ${table}:`, (err as Error)?.message ?? err);
    }
  };

  step('settings', () => seedSettings(db, opts.force ?? false));
  step('dishes', () => seedDishes(db, opts.force ?? false));
  step('reviews', () => seedReviews(db, opts.force ?? false));
  step('gallery', () => seedGallery(db, opts.force ?? false));
  step('opening_hours', () => seedHours(db, opts.force ?? false));

  return { seeded: seededTables.length > 0, tables: seededTables };
}

// CLI entry: npm run db:seed
if (import.meta.url === `file://${process.argv[1]}`) {
  const db = getDb();
  const force = process.argv.includes('--force');
  const result = seedAll(db, { force });
  console.log(
    result.seeded
      ? `Seeded baseline content into: ${result.tables.join(', ')}`
      : 'Database already seeded (use --force to re-seed).'
  );
  if (!force) {
    console.log('Note: review rows are DEMO content — replace or remove them from the admin panel.');
  }
}
