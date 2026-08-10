import type { DB } from '../db/index.js';

/**
 * Admin-facing list builders — published rows overlaid with pending drafts so
 * the console can show live draft state (published / modified / new / deleted)
 * without exposing the raw draft tables to templates.
 */

export interface AdminRow {
  id: number | null;
  draft_id: number | null;
  draftState: 'published' | 'modified' | 'new' | 'deleted';
  [k: string]: unknown;
}

export function adminDishes(db: DB): AdminRow[] {
  const published = db.prepare('SELECT * FROM dishes ORDER BY sort_order ASC, id ASC').all() as Record<string, unknown>[];
  const drafts = db.prepare('SELECT * FROM dishes_draft').all() as Record<string, unknown>[];
  const byPubId = new Map<number, Record<string, unknown>>(published.map((p) => [p.id as number, p]));
  const result: AdminRow[] = [];

  for (const p of published) {
    result.push({
      id: p.id as number | null,
      draft_id: null,
      draftState: 'published',
      type: p.type, name: p.name, description: p.description, name_np: p.name_np, description_np: p.description_np,
      price: p.price, category: p.category, category_np: p.category_np, badge: p.badge, badge_np: p.badge_np,
      image_url: p.image_url, is_featured: p.is_featured, is_visible: p.is_visible, sort_order: p.sort_order,
    });
  }

  const newItems: AdminRow[] = [];
  for (const d of drafts) {
    const rowId = d.row_id as number | null;
    const found = rowId ? byPubId.get(rowId) : null;
    if (d.op === 'delete') {
      if (found) {
        const it = result.find((r) => r.id === rowId);
        if (it) it.draftState = 'deleted';
      }
      continue;
    }
    if (found) {
      const it = result.find((r) => r.id === rowId);
      if (it) {
        for (const col of ['type', 'name', 'description', 'name_np', 'description_np', 'price', 'category', 'category_np', 'badge', 'badge_np', 'image_url', 'is_featured', 'is_visible', 'sort_order']) {
          if (d[col] !== undefined && d[col] !== null) it[col] = d[col];
        }
        it.draftState = 'modified';
      }
    } else {
      newItems.push({
        id: null,
        draft_id: d.draft_id as number | null,
        draftState: 'new',
        type: d.type ?? 'bestseller', name: d.name ?? '', description: d.description ?? '',
        name_np: d.name_np ?? '', description_np: d.description_np ?? '',
        price: d.price ?? null, category: d.category ?? null, category_np: d.category_np ?? '',
        badge: d.badge ?? null, badge_np: d.badge_np ?? '',
        image_url: d.image_url ?? null, is_featured: d.is_featured ?? 0,
        is_visible: d.is_visible ?? 1, sort_order: d.sort_order ?? 0,
      });
    }
  }
  return [...result, ...newItems];
}

export function adminReviews(db: DB): AdminRow[] {
  const published = db.prepare('SELECT * FROM reviews ORDER BY sort_order ASC, id ASC').all() as Record<string, unknown>[];
  const drafts = db.prepare('SELECT * FROM reviews_draft').all() as Record<string, unknown>[];
  const byPubId = new Map<number, Record<string, unknown>>(published.map((p) => [p.id as number, p]));
  const result: AdminRow[] = [];

  for (const p of published) {
    result.push({
      id: p.id as number | null,
      draft_id: null,
      draftState: 'published',
      name: p.name, text: p.text, name_np: p.name_np, text_np: p.text_np, rating: p.rating,
      image_url: p.image_url, is_visible: p.is_visible, sort_order: p.sort_order,
    });
  }
  const newItems: AdminRow[] = [];
  for (const d of drafts) {
    const rowId = d.row_id as number | null;
    const found = rowId ? byPubId.get(rowId) : null;
    if (d.op === 'delete') {
      if (found) {
        const it = result.find((r) => r.id === rowId);
        if (it) it.draftState = 'deleted';
      }
      continue;
    }
    if (found) {
      const it = result.find((r) => r.id === rowId);
      if (it) {
        for (const col of ['name', 'text', 'name_np', 'text_np', 'rating', 'image_url', 'is_visible', 'sort_order']) {
          if (d[col] !== undefined && d[col] !== null) it[col] = d[col];
        }
        it.draftState = 'modified';
      }
    } else {
      newItems.push({
        id: null,
        draft_id: d.draft_id as number | null,
        draftState: 'new',
        name: d.name ?? '', text: d.text ?? '', name_np: d.name_np ?? '', text_np: d.text_np ?? '', rating: d.rating ?? 5,
        image_url: d.image_url ?? null, is_visible: d.is_visible ?? 1, sort_order: d.sort_order ?? 0,
      });
    }
  }
  return [...result, ...newItems];
}

export function adminGallery(db: DB): AdminRow[] {
  const published = db.prepare('SELECT * FROM gallery ORDER BY sort_order ASC, id ASC').all() as Record<string, unknown>[];
  const drafts = db.prepare('SELECT * FROM gallery_draft').all() as Record<string, unknown>[];
  const byPubId = new Map<number, Record<string, unknown>>(published.map((p) => [p.id as number, p]));
  const result: AdminRow[] = [];

  for (const p of published) {
    result.push({
      id: p.id as number | null,
      draft_id: null,
      draftState: 'published',
      image_url: p.image_url, alt: p.alt,
      is_featured: p.is_featured, is_visible: p.is_visible, sort_order: p.sort_order,
    });
  }
  const newItems: AdminRow[] = [];
  for (const d of drafts) {
    const rowId = d.row_id as number | null;
    const found = rowId ? byPubId.get(rowId) : null;
    if (d.op === 'delete') {
      if (found) {
        const it = result.find((r) => r.id === rowId);
        if (it) it.draftState = 'deleted';
      }
      continue;
    }
    if (found) {
      const it = result.find((r) => r.id === rowId);
      if (it) {
        for (const col of ['image_url', 'alt', 'is_featured', 'is_visible', 'sort_order']) {
          if (d[col] !== undefined && d[col] !== null) it[col] = d[col];
        }
        it.draftState = 'modified';
      }
    } else {
      newItems.push({
        id: null,
        draft_id: d.draft_id as number | null,
        draftState: 'new',
        image_url: d.image_url ?? '', alt: d.alt ?? '',
        is_featured: d.is_featured ?? 0, is_visible: d.is_visible ?? 1, sort_order: d.sort_order ?? 0,
      });
    }
  }
  return [...result, ...newItems];
}
