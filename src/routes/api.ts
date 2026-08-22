import { Router } from 'express';
import type { Request, Response } from 'express';
import fs from 'node:fs';
import rateLimit from 'express-rate-limit';
import { getDb, prepareNamed } from '../db/index.js';
import {
  effectiveSettings,
  effectiveHours,
  saveSettingsDraft,
  saveDishDraft,
  deleteDishDraft,
  saveReviewDraft,
  deleteReviewDraft,
  reviewPublishProblems,
  saveGalleryDraft,
  deleteGalleryDraft,
  saveHoursDraft,
  restoreOriginalSetting,
  restoreOriginalRow,
  publishAll,
  discardDrafts,
  undoRevision,
  redoRevision,
  resetAll,
  draftStatus,
  listRevisions,
  restoreRevision,
} from '../lib/publish.js';
import { upload, registerMedia, pruneOrphanMedia, validateImageFile, optimizeImageFile } from '../lib/media.js';
import {
  required,
  maxLen,
  isUrl,
  isTime,
  isPrice,
  isIntRange,
  isOneOf,
  optStr,
  boolInt,
  toInt,
  isUsername,
  passwordError,
  type VErr,
} from '../lib/validate.js';
import type { DB } from '../db/index.js';
import { adminDishes, adminReviews, adminGallery } from '../lib/admin-lists.js';
import { ALL_SETTING_KEYS, SETTING_RULES } from '../lib/settings-defs.js';
import { verifyPassword, hashPassword } from '../lib/password.js';
import {
  recoveryConfigured,
  auditSecurity,
  invalidateAdminSessions,
} from '../lib/admin-security.js';

export const apiRouter = Router();

/** Broad general limiter for the whole admin API — stops runaway requests while
 *  staying well above a human CMS session's needs. */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Too many requests. Please try again later.' },
});
apiRouter.use(apiLimiter);

const ADMIN = (res: Response) => (res.locals.admin as { display_name?: string } | undefined)?.display_name ?? 'admin';

function fail(res: Response, status: number, error: string): void {
  res.status(status).json({ ok: false, error });
}

function ok(res: Response, data: Record<string, unknown> = {}): void {
  res.json({ ok: true, ...data });
}

/* ===================================================================== */
/* SETTINGS                                                              */
/* ===================================================================== */

const ALL_KEYS = ALL_SETTING_KEYS;

function publishedSettings(db: DB): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const r of db.prepare('SELECT key AS k, value AS v FROM settings').all() as { k: string; v: string | null }[]) {
    out[r.k] = r.v;
  }
  return out;
}

function baselineSettings(db: DB): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const r of db.prepare('SELECT key AS k, value AS v FROM settings_baseline').all() as { k: string; v: string | null }[]) {
    out[r.k] = r.v;
  }
  return out;
}

apiRouter.get('/settings', (_req, res) => {
  const db = getDb();
  const effective = effectiveSettings(db);
  const published = publishedSettings(db);
  const baseline = baselineSettings(db);
  const dirtyKeys = ALL_KEYS.filter((k) => (effective[k] ?? null) !== (published[k] ?? null));
  ok(res, {
    settings: Object.fromEntries(ALL_KEYS.map((k) => [k, effective[k] ?? null])),
    published: Object.fromEntries(ALL_KEYS.map((k) => [k, published[k] ?? null])),
    baseline: Object.fromEntries(ALL_KEYS.map((k) => [k, baseline[k] ?? null])),
    dirtyKeys,
  });
});

apiRouter.post('/settings/save', (req, res) => {
  const db = getDb();
  const body = (req.body ?? {}) as Record<string, unknown>;
  const errors: VErr = {};
  const values: Record<string, string | null> = {};
  for (const key of ALL_KEYS) {
    const rule = SETTING_RULES[key];
    const raw = body[key];
    const err = rule ? rule(raw) : null;
    if (err) errors[key] = err;
    const s = raw == null ? null : String(raw).trim();
    values[key] = s || null;
  }
  if (Object.keys(errors).length) {
    res.status(400).json({ ok: false, errors });
    return;
  }
  saveSettingsDraft(db, values);
  ok(res, { dirtyKeys: ALL_KEYS.filter((k) => values[k] !== (publishedSettings(db)[k] ?? null)) });
});

apiRouter.post('/settings/restore', (req, res) => {
  const db = getDb();
  const key = String((req.body ?? {}).key ?? '');
  if (!ALL_KEYS.includes(key)) {
    fail(res, 400, 'Unknown settings field.');
    return;
  }
  if (!restoreOriginalSetting(db, key)) {
    fail(res, 404, 'No original value exists for this field.');
    return;
  }
  ok(res, { key, value: effectiveSettings(db)[key] ?? null });
});

/* ===================================================================== */
/* DISHES                                                               */
/* ===================================================================== */

const DISH_TYPE = ['signature', 'bestseller'];

apiRouter.get('/dishes', (_req, res) => ok(res, { items: adminDishes(getDb()) }));

apiRouter.post('/dishes/save', (req, res) => {
  const db = getDb();
  const b = (req.body ?? {}) as Record<string, unknown>;
  const errors: VErr = {};
  const name = String(b.name ?? '').trim();
  const desc = String(b.description ?? '').trim();
  const nameNp = String(b.name_np ?? '').trim();
  const descNp = String(b.description_np ?? '').trim();
  const type = String(b.type ?? 'bestseller');
  errors.name = required(name) ?? maxLen(name, 120) ?? undefined;
  errors.type = isOneOf(type, DISH_TYPE) ?? undefined;
  errors.description = maxLen(desc, 800) ?? undefined;
  errors.name_np = maxLen(nameNp, 200) ?? undefined;
  errors.description_np = maxLen(descNp, 1000) ?? undefined;
  errors.price = isPrice(b.price) ?? undefined;
  errors.category = maxLen(b.category, 60) ?? undefined;
  errors.category_np = maxLen(b.category_np, 80) ?? undefined;
  errors.badge = maxLen(b.badge, 40) ?? undefined;
  errors.badge_np = maxLen(b.badge_np, 60) ?? undefined;
  errors.image_url = isUrl(b.image_url, true) ?? undefined;
  errors.sort_order = isIntRange(toInt(b.sort_order), -9999, 9999) ?? undefined;
  const filtered: VErr = {};
  for (const [k, v] of Object.entries(errors)) if (v) filtered[k] = v;
  if (Object.keys(filtered).length) {
    res.status(400).json({ ok: false, errors: filtered });
    return;
  }

  const rowId = b.row_id == null || b.row_id === '' ? null : toInt(b.row_id);
  const draftId = b.draft_id == null || b.draft_id === '' ? null : toInt(b.draft_id);
  const input = {
    row_id: rowId,
    type,
    name,
    description: desc,
    name_np: nameNp,
    description_np: descNp,
    price: optStr(b.price, 32),
    category: optStr(b.category, 60),
    category_np: optStr(b.category_np, 80) ?? '',
    badge: optStr(b.badge, 40),
    badge_np: optStr(b.badge_np, 60) ?? '',
    image_url: optStr(b.image_url, 500),
    is_featured: boolInt(b.is_featured),
    is_visible: boolInt(b.is_visible),
    sort_order: toInt(b.sort_order),
  };

  if (draftId) {
    // updating an existing new-item draft (not yet published)
    prepareNamed(db, 
      `UPDATE dishes_draft SET type=@type, name=@name, description=@description, name_np=@name_np,
       description_np=@description_np, price=@price, category=@category, category_np=@category_np,
       badge=@badge, badge_np=@badge_np, image_url=@image_url, is_featured=@is_featured,
       is_visible=@is_visible, sort_order=@sort_order, updated_at=datetime('now')
       WHERE draft_id=@draft_id`
    ).run({ ...input, draft_id: draftId });
  } else {
    if (rowId) db.prepare('DELETE FROM dishes_draft WHERE row_id = ?').run(rowId);
    saveDishDraft(db, input);
  }
  ok(res);
});

apiRouter.post('/dishes/delete', (req, res) => {
  const db = getDb();
  const b = (req.body ?? {}) as Record<string, unknown>;
  const rowId = b.row_id == null || b.row_id === '' ? null : toInt(b.row_id);
  const draftId = b.draft_id == null || b.draft_id === '' ? null : toInt(b.draft_id);
  if (rowId) {
    deleteDishDraft(db, rowId);
  } else if (draftId) {
    db.prepare('DELETE FROM dishes_draft WHERE draft_id = ?').run(draftId);
  } else {
    fail(res, 400, 'Missing dish reference.');
    return;
  }
  ok(res);
});

apiRouter.post('/dishes/restore', (req, res) => {
  const db = getDb();
  const id = toInt((req.body ?? {}).id);
  if (!id || !restoreOriginalRow(db, 'dishes', id)) {
    fail(res, 404, 'No original version exists for this dish.');
    return;
  }
  ok(res);
});

/* ===================================================================== */
/* REVIEWS                                                               */
/* ===================================================================== */

apiRouter.get('/reviews', (_req, res) => ok(res, { items: adminReviews(getDb()) }));

apiRouter.post('/reviews/save', (req, res) => {
  const db = getDb();
  const b = (req.body ?? {}) as Record<string, unknown>;
  const errors: VErr = {};
  const name = String(b.name ?? '').trim();
  const text = String(b.text ?? '').trim();
  const nameNp = String(b.name_np ?? '').trim();
  const textNp = String(b.text_np ?? '').trim();
  const isVisible = boolInt(b.is_visible);
  errors.name = required(name) ?? maxLen(name, 80) ?? undefined;
  errors.text = required(text) ?? maxLen(text, 800) ?? undefined;
  errors.name_np = maxLen(nameNp, 80) ?? undefined;
  errors.text_np = maxLen(textNp, 800) ?? undefined;
  if (isVisible) {
    if (!nameNp) errors.name_np = 'Reviewer name (नेपाली) is required for a visible review.';
    if (!textNp) errors.text_np = 'Review text (नेपाली) is required for a visible review.';
  }
  errors.rating = isIntRange(toInt(b.rating), 1, 5) ?? undefined;
  errors.image_url = isUrl(b.image_url, true) ?? undefined;
  errors.sort_order = isIntRange(toInt(b.sort_order), -9999, 9999) ?? undefined;
  const filtered: VErr = {};
  for (const [k, v] of Object.entries(errors)) if (v) filtered[k] = v;
  if (Object.keys(filtered).length) {
    res.status(400).json({ ok: false, errors: filtered });
    return;
  }

  const rowId = b.row_id == null || b.row_id === '' ? null : toInt(b.row_id);
  const draftId = b.draft_id == null || b.draft_id === '' ? null : toInt(b.draft_id);
  const input = {
    row_id: rowId,
    name,
    text,
    name_np: nameNp,
    text_np: textNp,
    rating: toInt(b.rating, 5),
    image_url: optStr(b.image_url, 500),
    is_visible: isVisible,
    sort_order: toInt(b.sort_order),
  };

  if (draftId) {
    prepareNamed(db, 
      `UPDATE reviews_draft SET name=@name, text=@text, name_np=@name_np, text_np=@text_np, rating=@rating, image_url=@image_url,
       is_visible=@is_visible, sort_order=@sort_order, updated_at=datetime('now')
       WHERE draft_id=@draft_id`
    ).run({ ...input, draft_id: draftId });
  } else {
    if (rowId) db.prepare('DELETE FROM reviews_draft WHERE row_id = ?').run(rowId);
    saveReviewDraft(db, input);
  }
  ok(res);
});

apiRouter.post('/reviews/delete', (req, res) => {
  const db = getDb();
  const b = (req.body ?? {}) as Record<string, unknown>;
  const rowId = b.row_id == null || b.row_id === '' ? null : toInt(b.row_id);
  const draftId = b.draft_id == null || b.draft_id === '' ? null : toInt(b.draft_id);
  if (rowId) {
    deleteReviewDraft(db, rowId);
  } else if (draftId) {
    db.prepare('DELETE FROM reviews_draft WHERE draft_id = ?').run(draftId);
  } else {
    fail(res, 400, 'Missing review reference.');
    return;
  }
  ok(res);
});

apiRouter.post('/reviews/restore', (req, res) => {
  const db = getDb();
  const id = toInt((req.body ?? {}).id);
  if (!id || !restoreOriginalRow(db, 'reviews', id)) {
    fail(res, 404, 'No original version exists for this review.');
    return;
  }
  ok(res);
});

/* ===================================================================== */
/* GALLERY                                                               */
/* ===================================================================== */

apiRouter.get('/gallery', (_req, res) => ok(res, { items: adminGallery(getDb()) }));

apiRouter.post('/gallery/save', (req, res) => {
  const db = getDb();
  const b = (req.body ?? {}) as Record<string, unknown>;
  const errors: VErr = {};
  errors.image_url = isUrl(b.image_url, true) ?? undefined;
  errors.alt = maxLen(b.alt, 120) ?? undefined;
  errors.sort_order = isIntRange(toInt(b.sort_order), -9999, 9999) ?? undefined;
  const filtered: VErr = {};
  for (const [k, v] of Object.entries(errors)) if (v) filtered[k] = v;
  if (Object.keys(filtered).length) {
    res.status(400).json({ ok: false, errors: filtered });
    return;
  }

  const rowId = b.row_id == null || b.row_id === '' ? null : toInt(b.row_id);
  const draftId = b.draft_id == null || b.draft_id === '' ? null : toInt(b.draft_id);
  const input = {
    row_id: rowId,
    image_url: String(b.image_url ?? '').trim(),
    alt: optStr(b.alt, 120) ?? '',
    is_featured: boolInt(b.is_featured),
    is_visible: boolInt(b.is_visible),
    sort_order: toInt(b.sort_order),
  };

  if (draftId) {
    prepareNamed(db, 
      `UPDATE gallery_draft SET image_url=@image_url, alt=@alt, is_featured=@is_featured,
       is_visible=@is_visible, sort_order=@sort_order, updated_at=datetime('now')
       WHERE draft_id=@draft_id`
    ).run({ ...input, draft_id: draftId });
  } else {
    if (rowId) db.prepare('DELETE FROM gallery_draft WHERE row_id = ?').run(rowId);
    saveGalleryDraft(db, input);
  }
  ok(res);
});

apiRouter.post('/gallery/create', (req, res) => {
  const db = getDb();
  const b = (req.body ?? {}) as Record<string, unknown>;
  const errors: VErr = {};
  errors.image_url = isUrl(b.image_url, true) ?? undefined;
  errors.alt = maxLen(b.alt, 120) ?? undefined;
  const filtered: VErr = {};
  for (const [k, v] of Object.entries(errors)) if (v) filtered[k] = v;
  if (Object.keys(filtered).length) {
    res.status(400).json({ ok: false, errors: filtered });
    return;
  }
  const maxSort = (db.prepare('SELECT MAX(sort_order) AS m FROM gallery').get() as { m: number | null }).m ?? 0;
  const draftMax = (db.prepare('SELECT MAX(sort_order) AS m FROM gallery_draft').get() as { m: number | null }).m ?? 0;
  saveGalleryDraft(db, {
    row_id: null,
    image_url: String(b.image_url ?? '').trim(),
    alt: optStr(b.alt, 120) ?? '',
    is_featured: boolInt(b.is_featured),
    is_visible: boolInt(b.is_visible),
    sort_order: Math.max(maxSort, draftMax) + 1,
  });
  ok(res);
});

apiRouter.post('/gallery/delete', (req, res) => {
  const db = getDb();
  const b = (req.body ?? {}) as Record<string, unknown>;
  const rowId = b.row_id == null || b.row_id === '' ? null : toInt(b.row_id);
  const draftId = b.draft_id == null || b.draft_id === '' ? null : toInt(b.draft_id);
  if (rowId) {
    deleteGalleryDraft(db, rowId);
  } else if (draftId) {
    db.prepare('DELETE FROM gallery_draft WHERE draft_id = ?').run(draftId);
  } else {
    fail(res, 400, 'Missing gallery image reference.');
    return;
  }
  ok(res);
});

apiRouter.post('/gallery/restore', (req, res) => {
  const db = getDb();
  const id = toInt((req.body ?? {}).id);
  if (!id || !restoreOriginalRow(db, 'gallery', id)) {
    fail(res, 404, 'No original version exists for this image.');
    return;
  }
  ok(res);
});

apiRouter.post('/gallery/reorder', (req, res) => {
  const db = getDb();
  const order = Array.isArray(req.body?.order) ? (req.body.order as { id?: unknown; draft_id?: unknown }[]) : [];
  if (!order.length) {
    fail(res, 400, 'No ordering provided.');
    return;
  }
  for (const item of order) {
    const idx = order.indexOf(item);
    if (item.draft_id != null && item.draft_id !== '') {
      db.prepare('UPDATE gallery_draft SET sort_order = ? WHERE draft_id = ?').run(idx + 1, toInt(item.draft_id));
    } else if (item.id != null && item.id !== '') {
      const rowId = toInt(item.id);
      db.prepare('DELETE FROM gallery_draft WHERE row_id = ? AND op = \'delete\'').run(rowId);
      const draft = db.prepare('SELECT draft_id FROM gallery_draft WHERE row_id = ? AND op = \'upsert\'').get(rowId) as { draft_id: number } | undefined;
      if (draft) {
        db.prepare('UPDATE gallery_draft SET sort_order = ? WHERE draft_id = ?').run(idx + 1, draft.draft_id);
      } else {
        db.prepare(
          `INSERT INTO gallery_draft (row_id, op, image_url, alt, is_featured, is_visible, sort_order, updated_at)
           VALUES (?, 'upsert', (SELECT image_url FROM gallery WHERE id = ?), (SELECT alt FROM gallery WHERE id = ?),
                   (SELECT is_featured FROM gallery WHERE id = ?), (SELECT is_visible FROM gallery WHERE id = ?), ?, datetime('now'))`
        ).run(rowId, rowId, rowId, rowId, rowId, idx + 1);
      }
    }
  }
  ok(res);
});

/* ===================================================================== */
/* OPENING HOURS                                                        */
/* ===================================================================== */

apiRouter.get('/hours', (_req, res) => {
  const db = getDb();
  const effective = effectiveHours(db);
  const published = db.prepare('SELECT * FROM opening_hours ORDER BY day_index').all() as Record<string, unknown>[];
  ok(res, { hours: effective, published });
});

apiRouter.post('/hours/save', (req, res) => {
  const db = getDb();
  const rows = Array.isArray(req.body?.days) ? (req.body.days as Record<string, unknown>[]) : [];
  if (rows.length !== 7) {
    fail(res, 400, 'All 7 days must be provided.');
    return;
  }
  const errors: VErr = {};
  const normalized: { day_index: number; day_name: string; is_open: number; open_time: string | null; close_time: string | null }[] = [];
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  rows.forEach((r, i) => {
    const dayIndex = toInt(r.day_index);
    const isOpen = boolInt(r.is_open);
    const open = isOpen ? String(r.open_time ?? '').trim() : '';
    const close = isOpen ? String(r.close_time ?? '').trim() : '';
    if (isOpen) {
      if (!TIME_OK(open)) errors[`days[${i}].open_time`] = 'Please enter a valid opening time (HH:MM).';
      if (!TIME_OK(close)) errors[`days[${i}].close_time`] = 'Please enter a valid closing time (HH:MM).';
      if (open && close) {
        const o = toMin(open);
        const c = close === '00:00' ? 24 * 60 : toMin(close);
        if (c <= o) errors[`days[${i}].close_time`] = 'Closing time must be after opening time.';
      }
    }
    normalized.push({
      day_index: dayIndex,
      day_name: dayNames[dayIndex] ?? String(r.day_name ?? ''),
      is_open: isOpen ? 1 : 0,
      open_time: isOpen ? open : null,
      close_time: isOpen ? close : null,
    });
  });
  if (Object.keys(errors).length) {
    res.status(400).json({ ok: false, errors });
    return;
  }
  saveHoursDraft(db, normalized);
  ok(res);
});

const TIME_OK = (t: string) => isTime(t) === null;
const toMin = (t: string) => {
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : 0;
};

/* ===================================================================== */
/* PUBLISH / DISCARD                                                    */
/* ===================================================================== */

apiRouter.get('/status', (_req, res) => {
  const db = getDb();
  const st = draftStatus(db);
  ok(res, { draft: st, dirty: st.count > 0 });
});

apiRouter.post('/publish', (req, res) => {
  const db = getDb();
  const problems = reviewPublishProblems(db);
  if (problems.length) {
    res.status(400).json({
      ok: false,
      error: 'Cannot publish — some visible reviews are incomplete.',
      problems,
    });
    return;
  }
  const result = publishAll(db, ADMIN(res));
  ok(res, { published: result.published, count: result.count });
});

apiRouter.post('/discard', (req, res) => {
  const db = getDb();
  const had = discardDrafts(db);
  ok(res, { discarded: had });
});

/* ===================================================================== */
/* REVISIONS — undo / redo / history / restore                          */
/* ===================================================================== */

apiRouter.get('/revisions', (_req, res) => {
  ok(res, { revisions: listRevisions(getDb(), 100) });
});

apiRouter.post('/undo', (req, res) => {
  const r = undoRevision(getDb());
  ok(res, r);
});

apiRouter.post('/redo', (req, res) => {
  const r = redoRevision(getDb());
  ok(res, r);
});

apiRouter.post('/revisions/restore', (req, res) => {
  const db = getDb();
  const id = toInt((req.body ?? {}).id);
  const okFlag = restoreRevision(db, id, ADMIN(res));
  if (!okFlag) {
    fail(res, 404, 'Revision not found.');
    return;
  }
  ok(res, { id });
});

/* ===================================================================== */
/* RESTORE ORIGINAL (generic row restore)                               */
/* ===================================================================== */

apiRouter.post('/restore-original', (req, res) => {
  const db = getDb();
  const kind = String((req.body ?? {}).kind ?? '');
  const rawId = (req.body ?? {}).id;
  if (!['settings', 'dishes', 'reviews', 'gallery', 'hours'].includes(kind)) {
    fail(res, 400, 'Invalid restore request.');
    return;
  }
  const id = kind === 'hours' ? toInt(rawId, -1) : toInt(rawId);
  if (kind === 'hours' ? id < 0 || id > 6 : !id) {
    fail(res, 400, 'Invalid restore request.');
    return;
  }
  const okFlag = restoreOriginalRow(db, kind as 'dishes' | 'reviews' | 'gallery' | 'hours', id);
  if (!okFlag) {
    fail(res, 404, 'No original version exists.');
    return;
  }
  ok(res);
});

/* ===================================================================== */
/* WHOLE WEBSITE RESET                                                   */
/* ===================================================================== */

apiRouter.post('/reset', (req, res) => {
  const confirm = String((req.body ?? {}).confirm ?? '');
  if (confirm !== 'RESET') {
    res.status(400).json({ ok: false, error: 'Type RESET to confirm the full website reset.' });
    return;
  }
  const db = getDb();
  resetAll(db, ADMIN(res));
  ok(res);
});

/* ===================================================================== */
/* UPLOAD                                                               */
/* ===================================================================== */

apiRouter.post('/upload', (req, res) => {
  upload.single('file')(req, res, async (err?: unknown) => {
    if (err) {
      const e = err as { code?: string; message?: string };
      const code = e.code ?? '';
      if (code.startsWith('LIMIT_')) {
        fail(res, 400, code === 'LIMIT_FILE_SIZE' ? 'Image is too large. Maximum allowed size is 8 MB.' : `Upload failed (${code}).`);
        return;
      }
      fail(res, 400, e.message || 'Invalid image upload.');
      return;
    }
    if (!req.file) {
      fail(res, 400, 'No file received. Please choose an image to upload.');
      return;
    }
    // Never trust the browser-supplied MIME type — verify the real file signature.
    if (!validateImageFile(req.file.path, req.file.mimetype)) {
      try {
        fs.rmSync(req.file.path, { force: true });
      } catch {
        /* best effort cleanup */
      }
      fail(res, 400, 'Upload rejected: the file is not a valid image.');
      return;
    }
    const db = getDb();
    const alt = String((req.body ?? {}).alt ?? '').trim().slice(0, 120);
    const dims = await optimizeImageFile(req.file);
    const id = registerMedia(db, req.file, alt, dims);
    ok(res, { url: `/uploads/${req.file.filename}`, mediaId: id });
  });
});

apiRouter.post('/media/prune', (req, res) => {
  const urlPath = String((req.body ?? {}).url ?? '');
  if (!urlPath.startsWith('/uploads/')) {
    fail(res, 400, 'Invalid media path.');
    return;
  }
  pruneOrphanMedia(getDb(), urlPath);
  ok(res);
});

/* ===================================================================== */
/* ADMIN SECURITY — authenticated credential management                  */
/* ===================================================================== */

apiRouter.get('/security/status', (_req, res) => {
  const db = getDb();
  ok(res, {
    recoveryConfigured: recoveryConfigured(db),
    username: (res.locals.admin as { username?: string } | undefined)?.username ?? '',
  });
});

apiRouter.post('/security/username', (req, res) => {
  const db = getDb();
  const body = (req.body ?? {}) as { current_password?: string; new_username?: string };
  const admin = res.locals.admin as { id: number; username: string; password_hash?: string; display_name: string };
  const row = db.prepare('SELECT * FROM admin_users WHERE id = ?').get(admin.id) as
    | { id: number; username: string; password_hash: string; display_name: string }
    | undefined;

  if (!row || !verifyPassword(String(body.current_password ?? ''), row.password_hash)) {
    auditSecurity(db, 'username_change_failed', 'wrong current password', req);
    fail(res, 400, 'Current password is incorrect.');
    return;
  }

  const newUsername = String(body.new_username ?? '').trim();
  const uErr = isUsername(newUsername);
  if (uErr) {
    fail(res, 400, uErr);
    return;
  }
  const dup = db.prepare('SELECT id FROM admin_users WHERE username = ? AND id != ?').get(newUsername, row.id);
  if (dup) {
    fail(res, 400, 'That username is already taken.');
    return;
  }

  db.prepare('UPDATE admin_users SET username = ?, updated_at = datetime(\'now\') WHERE id = ?').run(newUsername, row.id);

  // Keep the current session (update its identity), invalidate all other sessions.
  const sid = (req as Request & { sessionID?: string }).sessionID ?? '';
  invalidateAdminSessions(db, row.id, sid);
  (req.session as { admin?: { id: number; username: string; display_name: string; role?: string } }).admin = {
    id: row.id,
    username: newUsername,
    display_name: row.display_name,
    role: (res.locals.admin as { role?: string } | undefined)?.role ?? 'admin',
  };
  auditSecurity(db, 'username_changed', `admin #${row.id} changed username to ${newUsername}`, req);
  ok(res, { username: newUsername });
});

apiRouter.post('/security/password', (req, res) => {
  const db = getDb();
  const body = (req.body ?? {}) as { current_password?: string; new_password?: string; confirm_password?: string };
  const admin = res.locals.admin as { id: number; username: string };
  const row = db.prepare('SELECT * FROM admin_users WHERE id = ?').get(admin.id) as
    | { id: number; username: string; password_hash: string }
    | undefined;

  if (!row || !verifyPassword(String(body.current_password ?? ''), row.password_hash)) {
    auditSecurity(db, 'password_change_failed', 'wrong current password', req);
    fail(res, 400, 'Current password is incorrect.');
    return;
  }

  const password = String(body.new_password ?? '');
  const confirm = String(body.confirm_password ?? '');
  const pErr = passwordError(password);
  if (pErr) {
    fail(res, 400, pErr);
    return;
  }
  if (password !== confirm) {
    fail(res, 400, 'New passwords do not match.');
    return;
  }
  if (password.toLowerCase() === row.username.toLowerCase()) {
    fail(res, 400, 'Password must not equal the username.');
    return;
  }

  db.prepare('UPDATE admin_users SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?').run(
    hashPassword(password),
    row.id
  );

  // Invalidate ALL sessions for this admin, including the current one.
  invalidateAdminSessions(db, row.id);
  auditSecurity(db, 'password_changed', `admin #${row.id} changed password`, req);
  req.session.destroy(() => {
    res.clearCookie('sutra.sid');
    ok(res, { reauthRequired: true });
  });
});
