import type { DB } from '../db/index.js';

/**
 * Draft / Publish / Revision engine.
 *
 * Flow: edit -> Save Draft (writes *_draft tables) -> Preview (effective state)
 * -> Publish (applies drafts to published tables, records a full snapshot
 *    revision, clears drafts). Public site reads published state only.
 *
 * Revisions store complete site snapshots, so Undo / Redo / Restore remain
 * correct after page reloads.
 */

const POINTER_KEY = 'system.revisionPointer';

export type Kind = 'settings' | 'dishes' | 'reviews' | 'gallery' | 'hours';

export interface SiteSnapshot {
  settings: { key: string; value: string | null }[];
  dishes: Record<string, unknown>[];
  reviews: Record<string, unknown>[];
  gallery: Record<string, unknown>[];
  hours: Record<string, unknown>[];
}

/* ---------------- Effective state (published + draft overrides) ---------------- */

export function effectiveSettings(db: DB): Record<string, string | null> {
  const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string | null }[];
  const out: Record<string, string | null> = {};
  for (const r of rows) out[r.key] = r.value;
  const drafts = db.prepare('SELECT key, value FROM settings_draft').all() as { key: string; value: string | null }[];
  for (const d of drafts) out[d.key] = d.value;
  delete out[POINTER_KEY];
  return out;
}

function applyDraftRows<T extends Record<string, unknown>>(
  published: T[],
  drafts: { row_id: number | null; op: string; draft_id: number }[],
  overlay: (draft: Record<string, unknown>) => T
): T[] {
  const out = published.filter((p) => !drafts.some((d) => d.op === 'delete' && d.row_id === (p.id as number)));
  for (const d of drafts) {
    if (d.op === 'delete') continue;
    if (d.row_id) {
      const idx = out.findIndex((p) => (p.id as number) === d.row_id);
      if (idx >= 0) out[idx] = { ...out[idx], ...overlay(d) };
    } else {
      out.push({ ...overlay(d), id: -(d.draft_id) });
    }
  }
  return out;
}

export function effectiveDishes(db: DB): Record<string, unknown>[] {
  const published = db.prepare('SELECT * FROM dishes').all() as Record<string, unknown>[];
  const drafts = db
    .prepare(
      'SELECT draft_id, row_id, op, type, name, description, name_np, description_np, price, category, category_np, badge, badge_np, image_url, is_featured, is_visible, sort_order FROM dishes_draft'
    )
    .all() as Record<string, unknown>[];
  return applyDraftRows(published, drafts as never, (d) => ({
    type: d.type ?? 'bestseller',
    name: d.name ?? '',
    description: d.description ?? '',
    name_np: d.name_np ?? '',
    description_np: d.description_np ?? '',
    price: d.price ?? null,
    category: d.category ?? null,
    category_np: d.category_np ?? '',
    badge: d.badge ?? null,
    badge_np: d.badge_np ?? '',
    image_url: d.image_url ?? null,
    is_featured: d.is_featured ?? 0,
    is_visible: d.is_visible ?? 1,
    sort_order: d.sort_order ?? 0,
  }));
}

export function effectiveReviews(db: DB): Record<string, unknown>[] {
  const published = db.prepare('SELECT * FROM reviews').all() as Record<string, unknown>[];
  const drafts = db
    .prepare(
      'SELECT draft_id, row_id, op, name, text, rating, image_url, is_visible, sort_order FROM reviews_draft'
    )
    .all() as Record<string, unknown>[];
  return applyDraftRows(published, drafts as never, (d) => ({
    name: d.name ?? '',
    text: d.text ?? '',
    rating: d.rating ?? 5,
    image_url: d.image_url ?? null,
    is_visible: d.is_visible ?? 1,
    sort_order: d.sort_order ?? 0,
  }));
}

export function effectiveGallery(db: DB): Record<string, unknown>[] {
  const published = db.prepare('SELECT * FROM gallery').all() as Record<string, unknown>[];
  const drafts = db
    .prepare(
      'SELECT draft_id, row_id, op, image_url, alt, is_featured, is_visible, sort_order FROM gallery_draft'
    )
    .all() as Record<string, unknown>[];
  return applyDraftRows(published, drafts as never, (d) => ({
    image_url: d.image_url ?? '',
    alt: d.alt ?? '',
    is_featured: d.is_featured ?? 0,
    is_visible: d.is_visible ?? 1,
    sort_order: d.sort_order ?? 0,
  }));
}

export function effectiveHours(db: DB): Record<string, unknown>[] {
  const published = db.prepare('SELECT * FROM opening_hours').all() as Record<string, unknown>[];
  const drafts = db
    .prepare('SELECT day_index, day_name, is_open, open_time, close_time FROM opening_hours_draft')
    .all() as Record<string, unknown>[];
  return published.map((p) => {
    const d = drafts.find((x) => x.day_index === p.day_index);
    return d
      ? { ...p, day_name: d.day_name ?? p.day_name, is_open: d.is_open ?? p.is_open, open_time: d.open_time ?? p.open_time, close_time: d.close_time ?? p.close_time }
      : p;
  });
}

/* ---------------- Draft writes ---------------- */

export function saveSettingsDraft(db: DB, values: Record<string, string | null>): void {
  const upsert = db.prepare(
    `INSERT INTO settings_draft (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  );
  for (const [k, v] of Object.entries(values)) upsert.run(k, v);
}

export function saveDishDraft(
  db: DB,
  input: {
    row_id: number | null;
    type: string;
    name: string;
    description: string;
    name_np: string;
    description_np: string;
    price: string | null;
    category: string | null;
    category_np: string;
    badge: string | null;
    badge_np: string;
    image_url: string | null;
    is_featured: number;
    is_visible: number;
    sort_order: number;
  }
): void {
  db.prepare(
    `INSERT INTO dishes_draft (row_id, op, type, name, description, name_np, description_np, price, category, category_np, badge, badge_np, image_url, is_featured, is_visible, sort_order, updated_at)
     VALUES (@row_id, 'upsert', @type, @name, @description, @name_np, @description_np, @price, @category, @category_np, @badge, @badge_np, @image_url, @is_featured, @is_visible, @sort_order, datetime('now'))`
  ).run(input);
}

export function deleteDishDraft(db: DB, id: number): void {
  db.prepare(
    `INSERT INTO dishes_draft (row_id, op, updated_at) VALUES (?, 'delete', datetime('now'))`
  ).run(id);
}

export function saveReviewDraft(
  db: DB,
  input: {
    row_id: number | null;
    name: string;
    text: string;
    rating: number;
    image_url: string | null;
    is_visible: number;
    sort_order: number;
  }
): void {
  db.prepare(
    `INSERT INTO reviews_draft (row_id, op, name, text, rating, image_url, is_visible, sort_order, updated_at)
     VALUES (@row_id, 'upsert', @name, @text, @rating, @image_url, @is_visible, @sort_order, datetime('now'))`
  ).run(input);
}

export function deleteReviewDraft(db: DB, id: number): void {
  db.prepare(
    `INSERT INTO reviews_draft (row_id, op, updated_at) VALUES (?, 'delete', datetime('now'))`
  ).run(id);
}

export function saveGalleryDraft(
  db: DB,
  input: {
    row_id: number | null;
    image_url: string;
    alt: string;
    is_featured: number;
    is_visible: number;
    sort_order: number;
  }
): void {
  db.prepare(
    `INSERT INTO gallery_draft (row_id, op, image_url, alt, is_featured, is_visible, sort_order, updated_at)
     VALUES (@row_id, 'upsert', @image_url, @alt, @is_featured, @is_visible, @sort_order, datetime('now'))`
  ).run(input);
}

export function deleteGalleryDraft(db: DB, id: number): void {
  db.prepare(
    `INSERT INTO gallery_draft (row_id, op, updated_at) VALUES (?, 'delete', datetime('now'))`
  ).run(id);
}

export function saveHoursDraft(db: DB, rows: { day_index: number; day_name: string; is_open: number; open_time: string | null; close_time: string | null }[]): void {
  const upsert = db.prepare(
    `INSERT INTO opening_hours_draft (day_index, day_name, is_open, open_time, close_time, updated_at)
     VALUES (@day_index, @day_name, @is_open, @open_time, @close_time, datetime('now'))
     ON CONFLICT(day_index) DO UPDATE SET day_name = excluded.day_name, is_open = excluded.is_open, open_time = excluded.open_time, close_time = excluded.close_time, updated_at = excluded.updated_at`
  );
  for (const r of rows) upsert.run(r);
}

/* ---------------- Restore original (via draft) ---------------- */

export function restoreOriginalSetting(db: DB, key: string): boolean {
  const base = db.prepare('SELECT value FROM settings_baseline WHERE key = ?').get(key) as
    | { value: string | null }
    | undefined;
  if (!base) return false;
  db.prepare(
    `INSERT INTO settings_draft (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  ).run(key, base.value);
  return true;
}

export function restoreOriginalRow(db: DB, kind: Kind, id: number): boolean {
  if (kind === 'hours') {
    const base = db.prepare('SELECT day_name, is_open, open_time, close_time FROM opening_hours_baseline WHERE day_index = ?').get(id) as
      | { day_name: string; is_open: number; open_time: string | null; close_time: string | null }
      | undefined;
    if (!base) return false;
    saveHoursDraft(db, [{ day_index: id, ...base }]);
    return true;
  }
  if (kind === 'settings') {
    return restoreOriginalSetting(db, String(id));
  }
  if (kind === 'dishes' || kind === 'reviews' || kind === 'gallery') {
    const map = {
      dishes: { base: 'dishes_baseline', cols: ['type', 'name', 'description', 'name_np', 'description_np', 'price', 'category', 'category_np', 'badge', 'badge_np', 'image_url', 'is_featured', 'sort_order'] },
      reviews: { base: 'reviews_baseline', cols: ['name', 'text', 'rating', 'image_url', 'sort_order'] },
      gallery: { base: 'gallery_baseline', cols: ['image_url', 'alt', 'is_featured', 'sort_order'] },
    } as const;
    const spec = map[kind];
    const cur = db.prepare(`SELECT is_visible FROM ${kind} WHERE id = ?`).get(id) as { is_visible?: number } | undefined;
    if (!cur) return false;
    const base = db.prepare(`SELECT * FROM ${spec.base} WHERE baseline_ref = ?`).get(id) as Record<string, unknown> | undefined;
    if (!base) return false;

    const draftInput: Record<string, unknown> = { row_id: id };
    for (const col of spec.cols) draftInput[col] = base[col] ?? null;
    const is_visible = Number(cur.is_visible ?? 1);

    if (kind === 'dishes') {
    saveDishDraft(db, {
      row_id: id,
      type: (draftInput.type as string) ?? 'bestseller',
      name: (draftInput.name as string) ?? '',
      description: (draftInput.description as string) ?? '',
      price: (draftInput.price as string) ?? null,
      category: (draftInput.category as string) ?? null,
      badge: (draftInput.badge as string) ?? null,
      image_url: (draftInput.image_url as string) ?? null,
      is_featured: Number(draftInput.is_featured ?? 0),
      is_visible,
      sort_order: Number(draftInput.sort_order ?? 0),
    });
  } else if (kind === 'reviews') {
    saveReviewDraft(db, {
      row_id: id,
      name: (draftInput.name as string) ?? '',
      text: (draftInput.text as string) ?? '',
      rating: Number(draftInput.rating ?? 5),
      image_url: (draftInput.image_url as string) ?? null,
      is_visible,
      sort_order: Number(draftInput.sort_order ?? 0),
    });
  } else {
    saveGalleryDraft(db, {
      row_id: id,
      image_url: (draftInput.image_url as string) ?? '',
      alt: (draftInput.alt as string) ?? '',
      is_featured: Number(draftInput.is_featured ?? 0),
      is_visible,
      sort_order: Number(draftInput.sort_order ?? 0),
    });
  }
  }
  return true;
}
/* ---------------- Snapshots & revisions ---------------- */
function captureSnapshot(db: DB): SiteSnapshot {
  return {
    settings: (db.prepare('SELECT key, value FROM settings WHERE key != ?').all(POINTER_KEY) as { key: string; value: string | null }[]),
    dishes: db.prepare('SELECT * FROM dishes').all() as Record<string, unknown>[],
    reviews: db.prepare('SELECT * FROM reviews').all() as Record<string, unknown>[],
    gallery: db.prepare('SELECT * FROM gallery').all() as Record<string, unknown>[],
    hours: db.prepare('SELECT * FROM opening_hours').all() as Record<string, unknown>[],
  };
}

function applySnapshot(db: DB, snap: SiteSnapshot): void {
  const clear = (t: string) => db.prepare(`DELETE FROM ${t}`).run();
  const tx = db.transaction(() => {
    clear('settings');
    const insSettings = db.prepare('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime(\'now\'))');
    for (const r of snap.settings) insSettings.run(r.key, r.value);

    clear('dishes');
    const insDish = db.prepare(
      `INSERT INTO dishes (id, type, name, description, price, category, badge, image_url, is_featured, is_visible, sort_order, created_at, updated_at)
       VALUES (@id, @type, @name, @description, @price, @category, @badge, @image_url, @is_featured, @is_visible, @sort_order, @created_at, datetime('now'))`
    );
    for (const r of snap.dishes) insDish.run(r);

    clear('reviews');
    const insReview = db.prepare(
      `INSERT INTO reviews (id, name, text, rating, image_url, is_visible, sort_order, created_at, updated_at)
       VALUES (@id, @name, @text, @rating, @image_url, @is_visible, @sort_order, @created_at, datetime('now'))`
    );
    for (const r of snap.reviews) insReview.run(r);

    clear('gallery');
    const insGallery = db.prepare(
      `INSERT INTO gallery (id, image_url, alt, is_featured, is_visible, sort_order, created_at, updated_at)
       VALUES (@id, @image_url, @alt, @is_featured, @is_visible, @sort_order, @created_at, datetime('now'))`
    );
    for (const r of snap.gallery) insGallery.run(r);

    clear('opening_hours');
    const insHours = db.prepare(
      `INSERT INTO opening_hours (day_index, day_name, is_open, open_time, close_time, updated_at)
       VALUES (@day_index, @day_name, @is_open, @open_time, @close_time, datetime('now'))`
    );
    for (const r of snap.hours) insHours.run(r);
  });
  tx();
}

function recordRevision(db: DB, action: string, by: string | undefined): number {
  const snap = captureSnapshot(db);
  const info = db
    .prepare('INSERT INTO revisions (kind, action, snapshot, created_at, created_by) VALUES (?, ?, ?, datetime(\'now\'), ?)')
    .run('site', action, JSON.stringify(snap), by ?? null);
  const id = Number(info.lastInsertRowid);
  db.prepare('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime(\'now\')) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .run(POINTER_KEY, String(id));
  return id;
}

function getPointer(db: DB): number {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(POINTER_KEY) as { value: string } | undefined;
  const id = row ? Number(row.value) : 0;
  if (id) return id;
  const last = db.prepare('SELECT id FROM revisions ORDER BY id DESC LIMIT 1').get() as { id: number } | undefined;
  return last?.id ?? 0;
}

export function getRevisionById(db: DB, id: number): { id: number; action: string; kind: string; snapshot: string; created_at: string; created_by: string | null } | undefined {
  return db.prepare('SELECT id, action, kind, snapshot, created_at, created_by FROM revisions WHERE id = ?').get(id) as ReturnType<typeof getRevisionById>;
}

function setPointer(db: DB, id: number): void {
  db.prepare('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime(\'now\')) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .run(POINTER_KEY, String(id));
}

function restoreToRevision(db: DB, id: number, by: string | undefined): void {
  const rev = getRevisionById(db, id);
  if (!rev) return;
  applySnapshot(db, JSON.parse(rev.snapshot) as SiteSnapshot);
  setPointer(db, id);
  void by;
}

/**
 * Restores the whole site to the exact state captured by a historical
 * revision, then moves the undo/redo pointer onto that revision so further
 * undo/redo navigation stays correct.
 */
export function restoreRevision(db: DB, id: number, by?: string): boolean {
  const rev = getRevisionById(db, id);
  if (!rev) return false;
  const tx = db.transaction(() => {
    applySnapshot(db, JSON.parse(rev.snapshot) as SiteSnapshot);
    setPointer(db, id);
  });
  tx();
  void by;
  return true;
}

/* ---------------- Publish / discard / undo / redo / reset ---------------- */

function clearDrafts(db: DB): void {
  for (const t of ['settings_draft', 'dishes_draft', 'reviews_draft', 'gallery_draft', 'opening_hours_draft']) {
    db.prepare(`DELETE FROM ${t}`).run();
  }
}

export function publishAll(db: DB, by?: string): { published: string[]; count: number } {
  const pending = draftStatus(db);
  const applied: string[] = [];

  const tx = db.transaction(() => {
    // settings
    const drafts = db.prepare('SELECT key, value FROM settings_draft').all() as { key: string; value: string | null }[];
    const upsertSetting = db.prepare(
      `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    );
    for (const d of drafts) upsertSetting.run(d.key, d.value);
    if (drafts.length) applied.push('settings');

    // dishes
    const dishDrafts = db.prepare('SELECT * FROM dishes_draft').all() as Record<string, unknown>[];
    const insertDish = db.prepare(
      `INSERT INTO dishes (type, name, description, price, category, badge, image_url, is_featured, is_visible, sort_order, created_at, updated_at)
       VALUES (@type, @name, @description, @price, @category, @badge, @image_url, @is_featured, @is_visible, @sort_order, datetime('now'), datetime('now'))`
    );
    const updateDish = db.prepare(
      `UPDATE dishes SET type=@type, name=@name, description=@description, price=@price, category=@category, badge=@badge, image_url=@image_url, is_featured=@is_featured, is_visible=@is_visible, sort_order=@sort_order, updated_at=datetime('now') WHERE id=@row_id`
    );
    const deleteDish = db.prepare('DELETE FROM dishes WHERE id = ?');
    for (const d of dishDrafts) {
      if (d.op === 'delete') {
        if (d.row_id) deleteDish.run(d.row_id);
      } else if (d.row_id) {
        updateDish.run(d);
      } else {
        const info = insertDish.run(d);
        const newId = Number(info.lastInsertRowid);
        db.prepare('UPDATE dishes_draft SET row_id = ? WHERE draft_id = ?').run(newId, d.draft_id);
      }
    }
    if (dishDrafts.length) applied.push('dishes');

    // reviews
    const reviewDrafts = db.prepare('SELECT * FROM reviews_draft').all() as Record<string, unknown>[];
    const insertReview = db.prepare(
      `INSERT INTO reviews (name, text, rating, image_url, is_visible, sort_order, created_at, updated_at)
       VALUES (@name, @text, @rating, @image_url, @is_visible, @sort_order, datetime('now'), datetime('now'))`
    );
    const updateReview = db.prepare(
      `UPDATE reviews SET name=@name, text=@text, rating=@rating, image_url=@image_url, is_visible=@is_visible, sort_order=@sort_order, updated_at=datetime('now') WHERE id=@row_id`
    );
    const deleteReview = db.prepare('DELETE FROM reviews WHERE id = ?');
    for (const d of reviewDrafts) {
      if (d.op === 'delete') {
        if (d.row_id) deleteReview.run(d.row_id);
      } else if (d.row_id) {
        updateReview.run(d);
      } else {
        const info = insertReview.run(d);
        const newId = Number(info.lastInsertRowid);
        db.prepare('UPDATE reviews_draft SET row_id = ? WHERE draft_id = ?').run(newId, d.draft_id);
      }
    }
    if (reviewDrafts.length) applied.push('reviews');

    // gallery
    const galleryDrafts = db.prepare('SELECT * FROM gallery_draft').all() as Record<string, unknown>[];
    const insertGallery = db.prepare(
      `INSERT INTO gallery (image_url, alt, is_featured, is_visible, sort_order, created_at, updated_at)
       VALUES (@image_url, @alt, @is_featured, @is_visible, @sort_order, datetime('now'), datetime('now'))`
    );
    const updateGallery = db.prepare(
      `UPDATE gallery SET image_url=@image_url, alt=@alt, is_featured=@is_featured, is_visible=@is_visible, sort_order=@sort_order, updated_at=datetime('now') WHERE id=@row_id`
    );
    const deleteGallery = db.prepare('DELETE FROM gallery WHERE id = ?');
    for (const d of galleryDrafts) {
      if (d.op === 'delete') {
        if (d.row_id) deleteGallery.run(d.row_id);
      } else if (d.row_id) {
        updateGallery.run(d);
      } else {
        const info = insertGallery.run(d);
        const newId = Number(info.lastInsertRowid);
        db.prepare('UPDATE gallery_draft SET row_id = ? WHERE draft_id = ?').run(newId, d.draft_id);
      }
    }
    if (galleryDrafts.length) applied.push('gallery');

    // hours
    const hourDrafts = db.prepare('SELECT * FROM opening_hours_draft').all() as Record<string, unknown>[];
    const upsertHour = db.prepare(
      `INSERT INTO opening_hours (day_index, day_name, is_open, open_time, close_time, updated_at)
       VALUES (@day_index, @day_name, @is_open, @open_time, @close_time, datetime('now'))
       ON CONFLICT(day_index) DO UPDATE SET day_name = excluded.day_name, is_open = excluded.is_open, open_time = excluded.open_time, close_time = excluded.close_time, updated_at = excluded.updated_at`
    );
    for (const d of hourDrafts) upsertHour.run(d);
    if (hourDrafts.length) applied.push('opening_hours');

    if (applied.length) {
      db.prepare('DELETE FROM revisions WHERE id > ?').run(getPointer(db));
      clearDrafts(db);
      recordRevision(db, 'publish', by);
    }
  });
  tx();
  return { published: applied, count: pending.count };
}

export function discardDrafts(db: DB): boolean {
  const before = draftStatus(db).count;
  clearDrafts(db);
  return before > 0;
}

export function undoRevision(db: DB): { ok: boolean; to: number } {
  const pointer = getPointer(db);
  const prev = db.prepare('SELECT id FROM revisions WHERE id < ? ORDER BY id DESC LIMIT 1').get(pointer) as { id: number } | undefined;
  if (!prev) return { ok: false, to: pointer };
  restoreToRevision(db, prev.id, undefined);
  return { ok: true, to: prev.id };
}

export function redoRevision(db: DB): { ok: boolean; to: number } {
  const pointer = getPointer(db);
  const next = db.prepare('SELECT id FROM revisions WHERE id > ? ORDER BY id ASC LIMIT 1').get(pointer) as { id: number } | undefined;
  if (!next) return { ok: false, to: pointer };
  restoreToRevision(db, next.id, undefined);
  return { ok: true, to: next.id };
}

export function resetAll(db: DB, by?: string): { ok: boolean } {
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM settings').run();
    const insSetting = db.prepare('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime(\'now\'))');
    for (const r of db.prepare('SELECT key, value FROM settings_baseline').all() as { key: string; value: string | null }[]) {
      insSetting.run(r.key, r.value);
    }

    db.prepare('DELETE FROM dishes').run();
    const insDish = db.prepare(
      `INSERT INTO dishes (type, name, description, price, category, badge, image_url, is_featured, is_visible, sort_order, created_at, updated_at)
       VALUES (@type, @name, @description, @price, @category, @badge, @image_url, @is_featured, 1, @sort_order, datetime('now'), datetime('now'))`
    );
    for (const r of db.prepare('SELECT * FROM dishes_baseline').all() as Record<string, unknown>[]) {
      insDish.run(r);
    }

    db.prepare('DELETE FROM reviews').run();
    const insReview = db.prepare(
      `INSERT INTO reviews (name, text, rating, image_url, is_visible, sort_order, created_at, updated_at)
       VALUES (@name, @text, @rating, @image_url, 1, @sort_order, datetime('now'), datetime('now'))`
    );
    for (const r of db.prepare('SELECT * FROM reviews_baseline').all() as Record<string, unknown>[]) {
      insReview.run(r);
    }

    db.prepare('DELETE FROM gallery').run();
    const insGallery = db.prepare(
      `INSERT INTO gallery (image_url, alt, is_featured, is_visible, sort_order, created_at, updated_at)
       VALUES (@image_url, @alt, @is_featured, 1, @sort_order, datetime('now'), datetime('now'))`
    );
    for (const r of db.prepare('SELECT * FROM gallery_baseline').all() as Record<string, unknown>[]) {
      insGallery.run(r);
    }

    db.prepare('DELETE FROM opening_hours').run();
    const insHour = db.prepare(
      `INSERT INTO opening_hours (day_index, day_name, is_open, open_time, close_time, updated_at)
       VALUES (@day_index, @day_name, @is_open, @open_time, @close_time, datetime('now'))`
    );
    for (const r of db.prepare('SELECT * FROM opening_hours_baseline').all() as Record<string, unknown>[]) {
      insHour.run(r);
    }

    clearDrafts(db);
    db.prepare('DELETE FROM revisions WHERE id > ?').run(getPointer(db));
    recordRevision(db, 'reset', by);
  });
  tx();
  return { ok: true };
}

export function draftStatus(db: DB): { count: number; details: { kind: Kind; count: number }[] } {
  const kinds: Kind[] = ['settings', 'dishes', 'reviews', 'gallery', 'hours'];
  const TABLE: Record<Kind, string> = {
    settings: 'settings_draft',
    dishes: 'dishes_draft',
    reviews: 'reviews_draft',
    gallery: 'gallery_draft',
    hours: 'opening_hours_draft',
  };
  const details = kinds.map((kind) => {
    const c = (db.prepare(`SELECT COUNT(*) AS c FROM ${TABLE[kind]}`).get() as { c: number }).c;
    return { kind, count: c };
  });
  return { count: details.reduce((n, d) => n + d.count, 0), details };
}

export function listRevisions(db: DB, limit = 50): { id: number; action: string; kind: string; created_at: string; created_by: string | null; current: boolean }[] {
  const pointer = getPointer(db);
  const rows = db
    .prepare('SELECT id, action, kind, created_at, created_by FROM revisions ORDER BY id DESC LIMIT ?')
    .all(limit) as { id: number; action: string; kind: string; created_at: string; created_by: string | null }[];
  return rows.map((r) => ({ ...r, current: r.id === pointer }));
}
