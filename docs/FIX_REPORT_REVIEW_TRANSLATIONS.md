# Sutra Lounge — Review Translation/Data-Loss Fix Report

**Date:** 2026-08-10
**Scope:** Permanent prevention of review translation/data loss in the Sutra Lounge project.

## Goal

Every admin-created, published review must carry both English and Nepali (NP) content, the
public site must never show English-only text while the language is Nepali, and Yogesh
Sahani's review photo must remain untouched.

## Files Changed

| File | Change |
|------|--------|
| `src/db/translations.ts` | Added `'Yogesh Sahani'` entry to the `REVIEW_NP` map (name + full Nepali text, no emoji) so future seeds/backfills include his NP content. |
| `src/lib/publish.ts` | Added `reviewPublishProblems(db)` — lists every effective visible review missing `name_np` or `text_np`. |
| `src/routes/api.ts` | Review save trims NP values; a visible review now **requires** `name_np` + `text_np`; `/publish` returns HTTP 400 with `{ problems: [...] }` when any effective visible review is incomplete. |
| `js/admin.js` | `toggleItem` preserves `name_np`/`text_np` on show/hide; review modal marks NP fields required (hint + client-side validation); publish & settings-publish toasts surface `problems`; review rows show a `नेपाली` status pill; empty-state colspan updated to 7. |
| `views/admin/reviews.ejs` | Added `नेपाली` column with status pills (`Needs नेपाली` / `नेपाली ✓`); empty-state colspan 7. |
| `data/sutra.db` | Backfilled Yogesh Sahani's NP content (`reviews` + `reviews_baseline`) via the project's own migration path. **Photo untouched — still `img/avatar-ys.svg`.** |

## Not Changed (verified already correct)

- `views/index.ejs` — public review rendering already carries `data-np-text` / `data-np-name`.
- `js/main.js` — `applyDishTranslations` + `NP_ATTRS` already swap EN↔NP correctly.
- `src/db/schema.ts` — NP columns already existed (`TEXT NOT NULL DEFAULT ''`).

## Enforcement Points (two-layer guard)

1. **Save time** (`/admin/api/reviews/save`): a review whose `is_visible=1` (or is being
   switched to visible) is rejected unless it has non-empty `name_np` and `text_np`.
   Hidden/incomplete reviews may remain as drafts.
2. **Publish time** (`/admin/api/publish`): any effective visible review missing NP content
   blocks publishing with HTTP 400 and a `problems[]` list naming the offending reviews.

## Verification Results

- `npx tsc --noEmit` — passed.
- Save-time rejection of visible review without NP — `{"ok":false,"errors":{"name_np":...,"text_np":...}}`.
- Publish-time guard (injected legacy visible review lacking NP) — `HTTP 400` with
  `{"ok":false,"error":"Cannot publish — some visible reviews are incomplete.","problems":[...]}`.
- Show/hide toggle preserves NP fields — `{"ok":true}` on both directions.
- Public homepage renders `data-np-text` / `data-np-name` with correct Devanagari; language
  switching in `main.js` swaps text/name per language.
- Production audit — all 5 published reviews have both EN and NP content.
- Fresh-DB seed — all demo reviews carry NP via `REVIEW_NP`.
- Yogesh Sahani (`reviews.id=13`): `name_np='योगेश साहनी'`, long `text_np`, rating 5,
  `is_visible=1`, `image_url='img/avatar-ys.svg'` (unchanged).

## Notes

- Tested against a copy DB (`/tmp/opencode/test-sutra.db`) on port 5199; test server and
  artifacts cleaned up afterwards. No test artifacts remain.
- Backfill used the project's own `REVIEW_NP` map + `migrate()` path, not hand-written SQL.
