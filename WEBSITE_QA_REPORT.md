# SUTRA LOUNGE — MAIN WEBSITE / USER PANEL QA REPORT

**Scope:** Main website / user panel ONLY. Admin panel, dashboard, login, APIs, CRUD and CMS are **completely out of scope** and were not audited or modified.
**Method:** Live browser testing (headless Chromium 151) against the running dev server (PORT 4173) and production build (PORT 4174), plus rendered-DOM inspection, console/network capture, database cross-check and external destination verification. Viewports tested: 320 / 390 / 768 / 1024 / 1280 px. Nothing was fixed; this is an audit-only deliverable.

---

## A. EXECUTIVE SUMMARY

| Metric | Value |
| ------ | ----- |
| Overall status | **🟡 ALMOST PRODUCTION READY** |
| Main Website completion estimate | **~93%** |
| Tested pages / routes | 3 (`/`, `/menu.html`, 404 check; `/index.html` → 301 verified) |
| Tested buttons | 25 |
| Tested links | 20 |
| Tested forms | 1 (reservation form, 8 test cases) |
| Critical issues | 0 |
| Major issues | 0 |
| Minor issues (real bugs) | 5 |
| Improvements (non-blocking) | 6 |

Every core customer flow works end-to-end: finding the restaurant, viewing the menu, reserving a table, calling, WhatsApp ordering, finding the location on the map, and reaching social media. No launch-blocking defect was found. The issues below are quality/robustness gaps, not broken functionality.

---

## B. PAGE-BY-PAGE STATUS

| Page/Route | Status | Major Problem | Notes |
| ---------- | ------ | ------------- | ----- |
| `/` (Homepage) | ✅ FULLY WORKING | — | All 10 sections render; hero slider, gallery lightbox, quick-view modal, bestsellers tabs, theme/lang toggles, reservation form, maps embed all verified live. |
| `/index.html` | ✅ FULLY WORKING | — | 301 redirect to `/`. |
| `/menu.html` (Full Digital Menu) | ✅ FULLY WORKING | — | 7 dishes in 3 groups (Platters 3, Snacks & Pizza 2, Cocktails & Hookah 2); every dish has image, price, and working "Order on WhatsApp" link. Theme toggle and phone/home buttons work. |
| Unknown route (`/nonexistent`) | ⚠️ WORKING BUT HAS A PROBLEM | No custom 404 page | Express default `Cannot GET /nonexistent` returned (HTTP 404). Browser shows raw text. |
| `/robots.txt`, `/sitemap.xml` | ⚠️ NOT IMPLEMENTED | 404 | Neither file exists. Improvement-level (see SEO). |

---

## C. BUTTON AUDIT

Legend — status: ✅ works as expected; ⚠️ works but has a problem; ❌ broken.

| # | Button | Page/Section | Expected | Actual | Status | Severity |
| - | ------ | ------------ | -------- | ------ | ------ | -------- |
| 1 | Brand / logo | Header | Scroll to top (`#home`) | Navigates to `#home`, correct | ✅ | — |
| 2 | Nav links (7 anchors: Home/About/Signature Dishes/Bestsellers/Gallery/Reviews/Visit) | Header desktop | Smooth-scroll to section, scroll-spy highlights | All scroll correctly; spy highlights (`active` class verified through full scroll: `#home→…#visit`) | ✅ | — |
| 3 | Hamburger | Header (≤390px) | Open/close mobile nav | Opens and closes; outside-click and Escape close too; not stuck | ✅ | — |
| 4 | Theme toggle | Header (home + menu) | Toggle dark/light, persist | Toggles `data-theme`, persists via localStorage, applied on both pages | ✅ | — |
| 5 | Language toggle | Header (home) | EN ↔ नेपाली | Toggles 100 translatable elements; `<html lang>` updates | ✅ | — |
| 6 | Mobile bottom bar — Call | Home (mobile) | `tel:` dial | `tel:057522111` (correct) | ✅ | — |
| 7 | Mobile bottom bar — WhatsApp | Home (mobile) | Open WhatsApp | `https://wa.me/97757522111` (correct) | ✅ | — |
| 8 | Mobile bottom bar — Reserve | Home (mobile) | Scroll to form | `#contact` scrolls to reservation form | ✅ | — |
| 9 | Hero "Reserve a Table" | Home hero | Scroll to form | `#contact` works (scroll-margin-top keeps section clear of sticky header) | ✅ | — |
| 10 | Hero WhatsApp | Home hero | Open WhatsApp | `wa.me/97757522111?text=Hi Sutra Lounge!` opens | ✅ | — |
| 11 | "Watch the Sutra Lounge Tour" | Home video section | Open video modal | Modal opens; YouTube embed `…/embed/2sRGneKpy_k?autoplay=1&rel=0` injected; Escape closes | ✅ | — |
| 12 | Bestsellers tabs (All/Platters/Snacks & Pizza/Cocktails & Hookah) | Home bestsellers | Filter cards | All 4 tabs render correct non-empty sets | ✅ | — |
| 13 | Bestseller "Quick View" (×7) | Home bestsellers | Open quick-view modal | Modal shows correct name/price/desc/image; order link correct | ✅ | — |
| 14 | Bestseller "Order" (×7) | Home bestsellers | Open WhatsApp with dish+price | `wa.me/97757522111?text=…order the Bamboo Biryani (Rs 545)` — number and price correct | ✅ | — |
| 15 | Gallery items (×8) | Home gallery | Open lightbox | Lightbox opens with full image + caption | ✅ | — |
| 16 | Lightbox close / backdrop / Escape | Home gallery | Close lightbox | All three close paths work | ✅ | — |
| 17 | **Lightbox prev/next navigation** | Home gallery | Browse images inside lightbox | **No navigation controls exist** — no arrow buttons, no ArrowLeft/Right handler; each image requires close→click another. See BUG 3 | ⚠️ | Low |
| 18 | Video modal close (×) | Home | Close + stop video | Closes and clears iframe src (stops playback) | ✅ | — |
| 19 | Back-to-top floating button | Home | Smooth scroll to top | Appears after 600px, scrolls to 0 | ✅ | — |
| 20 | Reservation submit | Home contact | Validate + open WhatsApp | See FORM AUDIT; works for valid input | ✅ | — |
| 21 | Menu page "Call" | Menu header | Dial | `tel:057522111` | ✅ | — |
| 22 | Menu page "Back to Home" | Menu header | Navigate home | `/` loads | ✅ | — |
| 23 | Menu "Order on WhatsApp" (×7) | Menu page | WhatsApp with dish+price | Popup verified: `…/send/?phone=97757522111` correct | ✅ | — |
| 24 | "Get the Complete Menu on WhatsApp" (hero + CTA band) | Menu page | WhatsApp | `wa.me/97757522111?text=…share your complete menu…` | ✅ | — |
| 25 | "Reserve a Table" (hero + CTA band) | Menu page | Homepage `/#contact` | Verified: lands on homepage scrolled to contact (154px header offset) | ✅ | — |
| 26 | "Get Directions on Google Maps" | Home visit + Menu visit | Google Maps location | `https://share.google/4oidZH9ykv71zNlzV` returns 200 | ✅ | — |
| 27 | "WhatsApp Us" | Menu visit | WhatsApp | `wa.me/97757522111` | ✅ | — |

---

## D. LINK AUDIT

| # | Link | Destination | Expected | Actual | Status |
| - | ---- | ----------- | -------- | ------ | ------ |
| 1 | Phone `tel:057522111` (header/footer/form-alt/menu ×4) | Phone app | `057-522111` (matches contact info) | Correct number, display `057-522111` consistent | ✅ |
| 2 | WhatsApp `wa.me/97757522111` (hero/best-sellers/menu/mobile-bar/qv) | WhatsApp chat | Number 97757522111 | Resolves to `api.whatsapp.com/send/?phone=97757522111` (200); number = country 977 + 057522111 ✓ | ✅ |
| 3 | Email `mailto:sutralonguehtd@gmail.com` | Mail app | Correct address | Correct recipient | ✅ |
| 4 | Google Maps embed (Visit section) | Map iframe | Address `Hupra, Hetauda-4, Makwanpur, Nepal` | `maps.google.com/maps?q=Hupra%2C%20Hetauda-4…` loads, iframe 200 | ✅ |
| 5 | Get Directions | Google Maps share | Sutra Lounge location | `share.google/4oidZH9ykv71zNlzV` returns 200 | ✅ |
| 6 | Facebook | `facebook.com/SutraLounge/` | Profile page | 200 | ✅ |
| 7 | Instagram | `instagram.com/sutraloungehetauda/` | Profile page | 200 | ✅ |
| 8 | TikTok | `tiktok.com/@sutralounge` | Profile page | 200 | ✅ |
| 9 | YouTube | `youtu.be/2sRGneKpy_k` + embed | Tour video | 200; embed URL loads | ✅ |
| 10 | Footer address | — | `Hupra, Hetauda-4, Makwanpur, Nepal` | Text correct | ✅ |
| 11 | All internal anchors (`#home #about #menu #bestsellers #gallery #testimonials #visit #contact`) | Same-page sections | Section exists & scrolls | Every target id exists; every hash link matches a real id | ✅ |
| 12 | Menu → homepage CTAs (`/#contact`) | Homepage | Scroll to contact | Verified (y=9407, contact at 154px) | ✅ |
| 13 | `qvOrder` (`href="#"` placeholder) | Quick-view modal | Replaced by JS with wa.me link | On open, JS sets correct wa.me URL; never a dead `#` | ✅ |
| 14 | Social links `rel="noopener"` | — | — | All external links use `target="_blank" rel="noopener"` | ✅ |

**Note on social accounts:** all four social URLs return HTTP 200, and link formatting is correct. Whether each account actually exists (vs. a login wall) cannot be confirmed from the server side → 🔍 UNVERIFIABLE for account existence, ✅ for link correctness. Same for the map pin: the address query is correct but exact pin placement is 🔍 UNVERIFIABLE.

---

## E. FORM AUDIT — Reservation Form (`#reserveForm`)

| Test | Result | Status | Problem |
| ---- | ------ | ------ | ------- |
| Empty submission | 4 required fields flagged (name/phone/date/time), no WhatsApp opened | ✅ PASS | — |
| Valid submission | WhatsApp opens with `Name/Phone/Date/Time/Guests[/Note]` message to 97757522111 | ✅ PASS | — |
| Invalid phone (`123`) | Accepted as valid | ⚠️ FAIL | Only non-empty is checked — BUG 1 |
| Past date (`2020-01-01`) | Accepted as valid | ⚠️ FAIL | `min=today` set on input but never enforced by the JS handler — BUG 2 |
| Very long input (60-digit phone) | Accepted, no crash | ✅ PASS | No maxlength (minor) |
| Special characters / HTML (`O'Brien <b>&"'`) | Percent-encoded correctly; no HTML injection in the generated URL | ✅ PASS (safe) | — |
| Error reset on typing | `is-invalid`/`has-error` cleared on input | ✅ PASS | — |
| Guests + Note optional fields | Included in message only when set | ✅ PASS | — |
| Duplicate submission | Opens another WhatsApp tab | ✅ PASS | No throttling (low-value note) |

Data destination verified: the submitted message (name, phone, date, time, guests, note) is delivered to the restaurant owner's WhatsApp (97757522111) — the data does reach its intended destination. There is no backend persistence for reservations; this is the intended WhatsApp-first design.

---

## F. MOBILE AUDIT

| Viewport | Status | Problems |
| -------- | ------ | -------- |
| 320 px (home + menu) | ✅ PASS | No horizontal overflow (scrollWidth == innerWidth), hamburger works |
| 390 px (home + menu) | ✅ PASS | No overflow, mobile bottom bar correct, hamburger opens/closes |
| 768 px (home + menu) | ✅ PASS | No overflow |
| 1024 px (home + menu) | ✅ PASS | No overflow |
| 1280 px (home + menu) | ✅ PASS | No overflow, no overlap |

Cross-checked: sticky header doesn't overlap anchors (scroll-margin-top ≈154px); gallery/review/menu grids do not blow out; no text cropping or unclickable elements observed at any width.

---

## G. CONSOLE / NETWORK AUDIT

| Item | Result |
| ---- | ------ |
| Page JS errors | **None** (home + menu) |
| Page errors / unhandled exceptions | **None** |
| Failed requests | **None** (0 across both pages) |
| HTTP ≥400 responses | **None** (all assets 200) |
| Image requests | 23/23 HTTP 200 (Unsplash, `/img/avatar-*.jpg`, `/uploads/*.png`) |
| Fonts | Load correctly (Google Fonts) |
| Only console message | `Permissions policy violation: compute-pressure is not allowed in this document` — emitted by the headless browser's own internal compute-pressure feature; **not from site code** and harmless. |

---

## H. FUNCTIONAL BUGS

### BUG 1
**Severity:** Low
**Location:** Homepage → Contact section → `#reserveForm` → `#fPhone` (`js/main.js` submit handler)
**Feature:** Reservation form phone validation
**Expected:** An obviously invalid phone number (e.g. `123`) should be rejected with an inline error.
**Actual:** Any non-empty value passes; `123` produces a reservation WhatsApp message.
**Reproduction Steps:** Open `/`, scroll to contact, enter name + phone `123` + future date + time, submit → WhatsApp opens.
**Likely Cause:** Handler validates only falsiness (`hasError = !val`) for name/phone/date/time; no pattern/length check. The `type="tel"` + `required` attributes are never consulted because the JS handler runs first and the browser's native validation is bypassed by `preventDefault`.
**Recommended Fix:** Add a phone regex/length check (e.g. 7–15 digits, allow `+`/`-`/spaces) or call `form.checkValidity()` before building the link; show an inline error for bad phones.

### BUG 2
**Severity:** Low
**Location:** Homepage → Contact → `#reserveForm` → `#fDate`
**Feature:** Reservation date validation
**Expected:** Past dates should be rejected.
**Actual:** A past date (e.g. `2020-01-01`) is accepted and sent to WhatsApp.
**Reproduction Steps:** Open `/`, scroll to contact, fill form with a past date, submit → WhatsApp opens.
**Likely Cause:** `dateInput.min = todayISO` is set (line 487) but the submit handler never checks it; the custom `preventDefault` handler performs only the non-empty check.
**Recommended Fix:** In the submit handler compare `date` to today and flag `has-error` when earlier, or use the Constraint Validation API.

### BUG 3
**Severity:** Low (UX gap)
**Location:** Homepage → Gallery lightbox (`#lightbox`)
**Feature:** Gallery image navigation
**Expected:** A gallery lightbox typically allows browsing between images (prev/next arrows and/or arrow keys).
**Actual:** The lightbox only opens the clicked image and closes. There are no prev/next controls and no `ArrowLeft/ArrowRight` handling — the user must close and click another thumbnail.
**Reproduction Steps:** Click any gallery image → only that image can be viewed → no way to advance.
**Likely Cause:** Lightbox implementation (main.js section 10) covers open/caption/close only; navigation was never implemented.
**Recommended Fix:** Add prev/next buttons (and `aria-label`s) plus ArrowLeft/ArrowRight key handling, tracking the current gallery index.

### BUG 4
**Severity:** Low (i18n completeness)
**Location:** Homepage (Nepali mode) — mobile bottom bar + footer tagline
**Feature:** Language toggle completeness
**Expected:** In नेपाली mode all visible UI strings should be Nepali.
**Actual:** 4 strings remain English: `mobile.call` ("Call"), `mobile.reserve` ("Reserve"), `mobile.wa` ("WhatsApp"), `footer.love` ("Made with flavour in Hetauda").
**Reproduction Steps:** Open `/` at ≤390px → toggle to नेपाली → bottom bar + footer tagline still English.
**Likely Cause:** `I18N.np` has 119 keys vs 123 in `I18N.en`; the 4 missing keys fall back to English via `dict[key] || I18N.en[key]`.
**Recommended Fix:** Add the 4 Nepali translations to `I18N.np`.

### BUG 5
**Severity:** Low
**Location:** Server → unmatched routes (`/nonexistent`)
**Feature:** 404 handling
**Expected:** A branded, styled "Page not found" page (preferably 404 status) for unknown URLs.
**Actual:** Express default `Cannot GET /nonexistent` text page (HTTP 404 status is correct).
**Reproduction Steps:** Visit any unknown path.
**Likely Cause:** No catch-all 404 route/view in `src/server.ts`.
**Recommended Fix:** Add a catch-all route rendering a styled 404 view with a link back home, keeping HTTP 404 status.

---

## I. UX/UI ISSUES

| Issue | Type | Note |
| ----- | ---- | ---- |
| Gallery lightbox lacks prev/next browsing | Real usability gap | See BUG 3 |
| Reservation form accepts invalid phone / past dates | Real usability gap | See BUG 1/2 |
| Nepali mode shows 4 English strings | Real usability gap | See BUG 4 |
| No custom 404 page | Real UX gap | See BUG 5 |
| Homepage initial transfer ~2.1 MB (largest images 379/318/237 KB) | Performance polish | Improve responsive image sizes (see J) |
| Hero slides 2 & 3 reuse the same Unsplash photo as slide 1/other content | Cosmetic | Slides 1 & 3 both use `photo-1517248135467` (interior); consider a distinct third image |

No text overlap, cropping, spacing, or mobile-friendliness issues found. All reported items above are objective, reproduced defects — none are subjective design preferences.

---

## J. SEO / ACCESSIBILITY / PERFORMANCE

**SEO: ⚠️** Good foundation, missing optional polish.
- ✅ Unique `<title>` on both pages; unique meta description on both pages.
- ✅ Exactly one `<h1>` per page; clean H2 section hierarchy; semantic `<section>/<article>/<header>/<footer>`.
- ✅ Favicon (inline SVG data URI); `meta theme-color`; `<html lang>` correct.
- ✅ All 28 images have meaningful `alt` text; crawlable anchor navigation.
- ❌ No `<link rel="canonical">` (both pages).
- ❌ No Open Graph / Twitter Card tags (`og:title`, `og:image`, `og:description` all null) — limits social sharing previews.
- ❌ No `robots.txt`, no `sitemap.xml` (both 404).
- ❌ No custom 404 (see BUG 5).
- Note: the admin panel carries a noindex meta; the public pages do not need it.

**Accessibility: ⚠️**
- ✅ All 6 form fields have `<label for>`; `required` set correctly.
- ✅ All 3 modals use `role="dialog"` + `aria-label`; quick-view and lightbox set `aria-modal="true"`.
- ✅ Visible focus ring on all interactive elements (2px gold outline verified by keyboard Tab traversal).
- ✅ Keyboard reachable: brand → nav → lang toggle → …; Escape closes nav/modals; Enter activates links.
- ✅ Gallery `<button>` elements derive accessible names from their inner `<img alt>`.
- ✅ Review star rows expose `aria-label="5 out of 5 stars"`; iframes have `title`; icon-only social links have `aria-label`s.
- ✅ Back-to-top has an accessible name; hamburger updates `aria-expanded`.
- ⚠️ Nepali mode keeps 4 English strings (BUG 4).
- ⚠️ Color contrast not formally measured (no axe/Lighthouse run in this audit) → 🔍 UNVERIFIABLE.

**Performance: ⚠️**
- ✅ 26/28 images `loading="lazy"`; hero uses `preload`-friendly background; fonts non-blocking.
- ✅ No render-blocking third-party scripts; no framework bundle (vanilla JS, ~1 small script + 3 CSS).
- ⚠️ Homepage ≈2.1 MB transfer / 14 requests, dominated by Unsplash images. Largest: `photo-1504674900247` (379 KB), `photo-1517248135467` (318 KB), `photo-1517248135467` (237 KB). Above-the-fold hero/about could use `w=1200`-class URLs to cut ~half the weight.
- Note: no Lighthouse/perf-tool score was computed; figures above are measured transfer sizes.

---

## K. SECURITY (public site only)

| Check | Result |
| ----- | ------ |
| Secrets / API keys in client HTML/JS | ✅ None found |
| Unsafe HTML rendering of user content | ✅ Reviews, dish names/descriptions all rendered with EJS escaping (`<%= %>`); no `dangerouslySetInnerHTML`-style sinks fed by user data |
| `data-i18n-html` injection | ✅ Only server-composed values (tel link) — controlled input |
| Reservation form injection | ✅ Input percent-encoded into the WhatsApp URL; HTML-like input (`<b>`) cannot escape into the message |
| External link safety | ✅ All `target="_blank"` links use `rel="noopener"` |
| Form transport | ✅ Reservation data goes only to the owner's WhatsApp (no unintended endpoint) |
| No destructive testing performed | ✅ — audit was read-only |

---

## L. WHAT IS COMPLETE (verified working)

- Page delivery: `/` and `/menu.html` render fully with correct content, no blank screens, no redirect loops; `/index.html` → 301.
- Navigation: desktop anchors with working scroll-spy, logo, sticky header, hamburger mobile menu (open/close/outside-click/Escape), mobile bottom action bar, browser back/forward restores scroll.
- Restaurant CTAs: phone (`057-522111`), WhatsApp (`97757522111` — verified resolving), Google Maps embed + directions link (200), email, Facebook/Instagram/TikTok/YouTube (all 200).
- Menu: 7 bestseller dishes across 3 categories with images, prices, descriptions, badges; every dish has a working WhatsApp order link with correct name+price; quick-view modal correct.
- Bestsellers: tab filtering (All/Platters/Snacks & Pizza/Cocktails & Hookah) and quick-view order flow.
- Reservation form: full happy path (validation errors on empty; correct WhatsApp message on valid submit; error reset; safe encoding of special characters).
- Interactive UI: 3-slide hero auto-rotator, reveal-on-scroll (26/26), preloader dismissal, video modal (open/embed/close/stop), lightbox (open/caption/close/Escape), theme toggle + localStorage persistence, EN/NP language toggle (100 elements).
- Responsive: no horizontal overflow 320→1280 on both pages.
- Error surface: zero JS console errors, zero failed/4xx/5xx requests, zero broken images, all alt text present.

## M. WHAT IS NOT COMPLETE

- Gallery lightbox prev/next navigation (BUG 3).
- Phone/date validation on the reservation form (BUG 1, 2).
- Full Nepali translations (4 strings) (BUG 4).
- Custom 404 page (BUG 5).
- SEO polish: canonical, Open Graph tags, `robots.txt`, `sitemap.xml`.
- Social-account existence and exact map pin placement are **UNVERIFIABLE** externally (URLs/HTTP all correct).
- Actual YouTube video playback inside the modals was not confirmed (embed URL loads; playback is 🔍 UNVERIFIABLE in headless).

## N. PRIORITY FIX LIST

### 🔴 P0 — Critical
None.

### 🟠 P1 — High
None.

### 🟡 P2 — Medium
None.

### 🔵 P3 — Low
1. **BUG 1** — Validate phone format on reservation form (pattern/length check or `form.checkValidity()`).
2. **BUG 2** — Reject past reservation dates (enforce the existing `min`).
3. **BUG 3** — Add prev/next navigation (buttons + arrow keys) to the gallery lightbox.
4. **BUG 4** — Add 4 missing Nepali translations.
5. **BUG 5** — Add a styled 404 page.
6. **SEO** — Add `robots.txt`, `sitemap.xml`, canonical URLs, and Open Graph tags.
7. **Performance** — Serve hero/about images at smaller responsive sizes (biggest saves ~400 KB on first load).

## O. FINAL VERDICT

### 🟡 ALMOST PRODUCTION READY

Every important customer-facing function — loading both pages, navigation, the full reservation flow, WhatsApp ordering, call/email/socials/maps CTAs, gallery, bestsellers, theme/language toggles, and the entire responsive layout — was exercised live and works. Zero critical, zero high, and zero medium-severity issues were found. The five remaining items are low-severity quality gaps (form validation strictness, lightbox browsing, four missing translations, custom 404) plus SEO/performance polish. Nothing here blocks launch, but fixing P3 items 1–5 would make the site fully solid.
