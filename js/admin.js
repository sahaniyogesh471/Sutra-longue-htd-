/* Sutra Lounge Admin Console — shared front-end behaviour.
 * Handles: toasts, modals, confirms, draft/publish/undo/redo/reset,
 * settings form, dishes/reviews/gallery CRUD, reviewer photo crop, uploads.
 */
(function () {
  'use strict';

  function csrf() {
    const m = document.querySelector('meta[name="csrf-token"]');
    return m ? m.getAttribute('content') : '';
  }

  function esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  async function api(path, opts) {
    const o = opts || {};
    const method = o.method || 'POST';
    const headers = { 'X-CSRF-Token': csrf() };
    let body;
    if (method === 'GET' || method === 'HEAD') {
      body = undefined;
    } else if (o.body instanceof FormData) {
      body = o.body;
    } else {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(o.body || {});
    }
    const res = await fetch(path, { method, headers, body });
    const data = await res.json().catch(function () { return {}; });
    return { status: res.status, ...data };
  }

  function toast(msg, type) {
    const wrap = document.getElementById('toastWrap');
    if (!wrap) return;
    const el = document.createElement('div');
    el.className = 'toast toast-' + (type || 'success');
    el.textContent = msg;
    wrap.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('show'); });
    setTimeout(function () {
      el.classList.remove('show');
      setTimeout(function () { el.remove(); }, 300);
    }, 3400);
  }

  function pageData() {
    const el = document.getElementById('admin-data');
    if (!el) return null;
    try { return JSON.parse(el.textContent); } catch (e) { return null; }
  }

  function findItem(items, rowKey) {
    return (items || []).find(function (it) {
      return String(it.id) === String(rowKey) || String(it.draft_id) === String(rowKey);
    });
  }

  /* ---------------- In-place list re-render (no full reload) ---------------- */

  function statusPill(d) {
    if (d.draftState === 'deleted') return '<span class="pill pill-danger">Will be removed</span>';
    return Number(d.is_visible) === 1 ? '<span class="pill pill-ok">Visible</span>' : '<span class="pill">Hidden</span>';
  }

  function rowActions(d, kind) {
    const key = d.id != null ? d.id : d.draft_id;
    let h = '';
    if (d.draftState !== 'deleted') {
      h += '<button class="btn btn-ghost btn-tiny" type="button" data-edit="' + key + '">Edit</button>';
    }
    h += '<button class="btn btn-ghost btn-tiny" type="button" data-toggle="' + key + '">' + (Number(d.is_visible) === 1 ? 'Hide' : 'Show') + '</button>';
    if (d.id) {
      h += '<button class="btn btn-ghost btn-tiny" type="button" data-restore-row="' + d.id + '" title="Restore original values">Restore</button>';
    }
    h += '<button class="btn btn-danger btn-tiny" type="button" data-delete="' + key + '">Delete</button>';
    return h;
  }

  function dishRow(d) {
    const key = d.id != null ? d.id : d.draft_id;
    return '<tr class="state-' + d.draftState + '" data-row="' + key + '" data-kind="dishes" data-id="' + (d.id || '') + '" data-draft-id="' + (d.draft_id || '') + '">' +
      '<td class="cell-thumb">' + (d.image_url ? '<img src="' + esc(d.image_url) + '" alt="" loading="lazy">' : '<span class="thumb-empty"></span>') + '</td>' +
      '<td><div class="cell-title"><strong>' + esc(d.name) + '</strong>' +
      (d.badge ? '<span class="pill pill-gold">' + esc(d.badge) + '</span>' : '') +
      (Number(d.is_featured) === 1 ? '<span class="pill pill-gold">Featured</span>' : '') +
      '</div><span class="cell-sub">' + d.draftState + '</span></td>' +
      '<td><span class="pill">' + esc(d.type) + '</span></td>' +
      '<td>' + esc(d.price || '—') + '</td>' +
      '<td>' + esc(d.category || '—') + '</td>' +
      '<td>' + statusPill(d) + '</td>' +
      '<td class="cell-actions">' + rowActions(d, 'dishes') + '</td></tr>';
  }

  function reviewRow(r) {
    const key = r.id != null ? r.id : r.draft_id;
    const npMissing = !String(r.name_np || '').trim() || !String(r.text_np || '').trim();
    const npPill = npMissing
      ? '<span class="pill pill-danger">Needs नेपाली</span>'
      : '<span class="pill pill-ok">नेपाली ✓</span>';
    return '<tr class="state-' + r.draftState + '" data-row="' + key + '" data-kind="reviews" data-id="' + (r.id || '') + '" data-draft-id="' + (r.draft_id || '') + '">' +
      '<td class="cell-avatar">' + (r.image_url ? '<img src="' + esc(r.image_url) + '" alt="">' : '<span class="avatar-empty">' + esc(String(r.name || '?').charAt(0)) + '</span>') + '</td>' +
      '<td><strong>' + esc(r.name) + '</strong><span class="cell-sub">' + r.draftState + '</span></td>' +
      '<td><span class="stars" aria-label="' + esc(r.rating) + ' star rating">★' + esc(r.rating) + '/5</span></td>' +
      '<td class="cell-text">' + esc(r.text) + '</td>' +
      '<td>' + npPill + '</td>' +
      '<td>' + statusPill(r) + '</td>' +
      '<td class="cell-actions">' + rowActions(r, 'reviews') + '</td></tr>';
  }

  function galleryTile(g) {
    const key = g.id != null ? g.id : g.draft_id;
    return '<div class="gallery-tile state-' + g.draftState + '" draggable="true" data-row="' + key + '" data-kind="gallery" data-id="' + (g.id || '') + '" data-draft-id="' + (g.draft_id || '') + '">' +
      '<div class="gallery-img"><img src="' + esc(g.image_url) + '" alt="' + esc(g.alt) + '" loading="lazy">' +
      (Number(g.is_featured) === 1 ? '<span class="badge-featured">Featured</span>' : '') +
      (g.draftState === 'deleted' ? '<span class="badge-overlay">Will be removed</span>' : '') +
      '<span class="grip" title="Drag to reorder">⠿</span></div>' +
      '<div class="gallery-meta"><span class="cell-sub">' + esc(g.alt || 'No alt text') + ' · ' + g.draftState + '</span></div>' +
      '<div class="gallery-actions">' +
      (g.draftState !== 'deleted'
        ? '<button class="btn btn-ghost btn-tiny" type="button" data-edit="' + key + '">Edit</button>' +
          (Number(g.is_featured) !== 1 ? '<button class="btn btn-ghost btn-tiny" type="button" data-feature="' + key + '">Set featured</button>' : '') +
          '<button class="btn btn-ghost btn-tiny" type="button" data-toggle="' + key + '">' + (Number(g.is_visible) === 1 ? 'Hide' : 'Show') + '</button>'
        : '') +
      (g.id ? '<button class="btn btn-ghost btn-tiny" type="button" data-restore-row="' + g.id + '" title="Restore original values">Restore</button>' : '') +
      '<button class="btn btn-danger btn-tiny" type="button" data-delete="' + key + '">Delete</button>' +
      '</div></div>';
  }

  async function refreshList(kind) {
    if (['dishes', 'reviews', 'gallery'].indexOf(kind) === -1) return false;
    const r = await api('/admin/api/' + kind, { method: 'GET' });
    if (!r.ok || !r.items) return false;
    const dataEl = document.getElementById('admin-data');
    if (dataEl) {
      dataEl.textContent = JSON.stringify({ items: r.items }).replace(/</g, '\\u003c');
    }
    const table = document.querySelector('[data-table="' + kind + '"]');
    if (!table) return false;
    if (kind === 'gallery') {
      if (r.items.length === 0) {
        table.innerHTML = '<div class="empty"><h4>No gallery images yet.</h4><p class="muted">Upload your first photo to get started.</p></div>';
      } else {
        table.innerHTML = r.items.map(galleryTile).join('');
      }
    } else {
      const tbody = table.querySelector('tbody');
      if (!tbody) return false;
      if (r.items.length === 0) {
        const cols = kind === 'dishes' ? 7 : kind === 'reviews' ? 7 : 6;
        tbody.innerHTML = '<tr><td colspan="' + cols + '" class="empty"><h4>No ' + (kind === 'dishes' ? 'dishes' : 'reviews') + ' added yet.</h4><p class="muted">Add your first ' + (kind === 'dishes' ? 'menu item' : 'review') + '.</p></td></tr>';
      } else {
        tbody.innerHTML = r.items.map(kind === 'dishes' ? dishRow : reviewRow).join('');
      }
    }
    return true;
  }

  async function refreshCurrentList() {
    const table = document.querySelector('[data-table]');
    if (!table) return false;
    return refreshList(table.getAttribute('data-table'));
  }

  /* ---------------- Modal helpers ---------------- */

  function openModal(html, opts) {
    const root = document.getElementById('modalRoot');
    if (!root) return null;
    const el = document.createElement('div');
    el.className = 'modal';
    const size = (opts && opts.size) || '';
    el.innerHTML =
      '<div class="modal-backdrop"></div>' +
      '<div class="modal-box ' + size + '"><button class="modal-close" data-close-modal aria-label="Close">' +
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>' +
      '</button>' + html + '</div>';
    root.appendChild(el);
    const close = function () { el.remove(); };
    el.querySelector('.modal-backdrop').addEventListener('click', close);
    el.querySelectorAll('[data-close-modal]').forEach(function (b) { b.addEventListener('click', close); });
    el.addEventListener('click', function (e) { if (e.target === el) close(); });
    return { el: el, close: close };
  }

  function confirmDialog(opts) {
    return new Promise(function (resolve) {
      const title = opts.title || 'Are you sure?';
      const msg = opts.message || '';
      const confirmText = opts.confirmText || 'Confirm';
      const danger = opts.danger !== false;
      const m = openModal(
        '<h3>' + esc(title) + '</h3>' +
        (msg ? '<p>' + esc(msg) + '</p>' : '') +
        '<div class="modal-actions">' +
        '<button class="btn btn-ghost" data-close-modal type="button">Cancel</button>' +
        '<button class="btn ' + (danger ? 'btn-danger' : 'btn-gold') + '" data-confirm type="button">' + esc(confirmText) + '</button>' +
        '</div>',
        { size: 'modal-sm' }
      );
      m.el.querySelector('[data-confirm]').addEventListener('click', function () {
        m.close();
        resolve(true);
      });
      m.el.querySelectorAll('[data-close-modal], .modal-backdrop').forEach(function (b) {
        b.addEventListener('click', function () { resolve(false); });
      });
    });
  }

  function showErrors(el, errors) {
    if (!errors) return;
    Object.keys(errors).forEach(function (key) {
      const wrap = el.querySelector('[data-field-wrap="' + key + '"]');
      const errEl = el.querySelector('[data-error="' + key + '"]');
      if (errEl) errEl.textContent = errors[key];
      if (wrap) wrap.classList.add('is-error');
    });
  }

  function clearErrors(el) {
    el.querySelectorAll('.is-error').forEach(function (w) { w.classList.remove('is-error'); });
    el.querySelectorAll('[data-error]').forEach(function (e) { e.textContent = ''; });
  }

  /* ---------------- Uploads ---------------- */

  function uploadImage(file, alt) {
    const fd = new FormData();
    fd.append('file', file);
    if (alt) fd.append('alt', alt);
    return api('/admin/api/upload', { body: fd });
  }

  function wireFileInput(input, onUrl) {
    input.addEventListener('change', async function () {
      const file = input.files[0];
      if (!file) return;
      if (!file.type || !file.type.startsWith('image/')) {
        toast('Please choose an image file.', 'error');
        return;
      }
      if (file.size > 8 * 1024 * 1024) {
        toast('Image must be under 8 MB.', 'error');
        return;
      }
      input.disabled = true;
      const r = await uploadImage(file, '');
      input.disabled = false;
      if (!r.ok) {
        toast(r.error || 'Upload failed. Please try again.', 'error');
        return;
      }
      onUrl(r.url);
    });
  }

  function hiddenFileInput(accept) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept || 'image/*';
    return input;
  }

  /* ---------------- Reviewer photo crop editor ---------------- */

  function openCropEditor(sourceUrl, onSave) {
    const m = openModal(
      '<h3>Crop reviewer photo</h3>' +
      '<p class="muted">Use zoom and the arrow buttons to position the face in the circle.</p>' +
      '<div class="crop-stage"><div class="crop-circle"><canvas data-crop-canvas width="400" height="400"></canvas></div></div>' +
      '<div class="crop-controls">' +
      '<div class="crop-pad">' +
      '<button class="btn btn-ghost btn-tiny" type="button" data-pan="up" aria-label="Move up">▲</button>' +
      '<button class="btn btn-ghost btn-tiny" type="button" data-pan="left" aria-label="Move left">◀</button>' +
      '<button class="btn btn-ghost btn-tiny" type="button" data-pan="right" aria-label="Move right">▶</button>' +
      '<button class="btn btn-ghost btn-tiny" type="button" data-pan="down" aria-label="Move down">▼</button>' +
      '</div>' +
      '<div class="crop-zoom"><label for="cropZoom">Zoom</label><input id="cropZoom" type="range" min="40" max="300" value="100" data-zoom></div>' +
      '<button class="btn btn-ghost btn-tiny" type="button" data-crop-reset>Reset crop</button>' +
      '</div>' +
      '<div class="modal-actions">' +
      '<button class="btn btn-ghost" data-close-modal type="button">Cancel</button>' +
      '<button class="btn btn-gold" data-crop-save type="button">Save photo</button>' +
      '</div>'
    );
    if (!m) return;
    const el = m.el;
    const cvs = el.querySelector('[data-crop-canvas]');
    const ctx = cvs.getContext('2d');
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const VIEW = 300;
    let zoom = 1, tx = 0, ty = 0;

    function draw() {
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      const base = VIEW / Math.min(w, h);
      const z = zoom * base;
      const srcSize = VIEW / z;
      const sx = w / 2 + tx / z - srcSize / 2;
      const sy = h / 2 + ty / z - srcSize / 2;
      cvs.width = 400;
      cvs.height = 400;
      ctx.clearRect(0, 0, 400, 400);
      ctx.save();
      ctx.beginPath();
      ctx.arc(200, 200, 200, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, sx, sy, srcSize, srcSize, 0, 0, 400, 400);
      ctx.restore();
    }

    img.onload = function () { draw(); };
    img.onerror = function () { toast('Could not load the image.', 'error'); m.close(); };
    img.src = sourceUrl;

    el.querySelector('[data-zoom]').addEventListener('input', function (e) {
      zoom = Number(e.target.value) / 100;
      draw();
    });
    const PAN = 24;
    el.querySelectorAll('[data-pan]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const d = btn.getAttribute('data-pan');
        if (d === 'up') ty -= PAN;
        else if (d === 'down') ty += PAN;
        else if (d === 'left') tx -= PAN;
        else if (d === 'right') tx += PAN;
        draw();
      });
    });
    el.querySelector('[data-crop-reset]').addEventListener('click', function () {
      zoom = 1; tx = 0; ty = 0;
      el.querySelector('[data-zoom]').value = 100;
      draw();
    });
    el.querySelector('[data-crop-save]').addEventListener('click', function () {
      cvs.toBlob(async function (blob) {
        if (!blob) { toast('Could not create the cropped image.', 'error'); return; }
        const file = new File([blob], 'reviewer-photo.png', { type: 'image/png' });
        const r = await uploadImage(file, 'reviewer photo');
        if (!r.ok) { toast(r.error || 'Upload failed.', 'error'); return; }
        onSave(r.url);
        toast('Photo saved.');
        m.close();
      }, 'image/png');
    });
  }

  /* ---------------- Entity CRUD modals ---------------- */

  function imageFieldBlock(current, name) {
    return (
      '<div class="field">' +
      '<label>Photo</label>' +
      '<div class="upload-block">' +
      (current ? '<div class="upload-preview"><img src="' + esc(current) + '" alt=""></div>' : '') +
      '<div class="upload-buttons">' +
      '<button class="btn btn-ghost btn-small" type="button" data-upload="' + name + '">Upload / replace</button>' +
      (current ? '<button class="btn btn-ghost btn-small" type="button" data-remove-image>Remove</button>' : '') +
      '</div>' +
      '</div>' +
      '<input type="hidden" name="image_url" value="' + esc(current || '') + '">' +
      '<p class="field-error" data-error="image_url"></p>' +
      '</div>'
    );
  }

  function buildModalForm(config) {
    const item = config.item || {};
    const m = openModal(
      '<h3>' + config.title + '</h3>' +
      '<form data-form="' + config.kind + '">' +
      '<input type="hidden" name="row_id" value="' + esc(item.id || '') + '">' +
      '<input type="hidden" name="draft_id" value="' + esc(item.draft_id || '') + '">' +
      config.body +
      '<div class="modal-actions">' +
      '<button class="btn btn-ghost" data-close-modal type="button">Cancel</button>' +
      '<button class="btn btn-gold" type="submit">' + (config.saveLabel || 'Save draft') + '</button>' +
      '</div>' +
      '</form>'
    );
    return m;
  }

  function openDishModal(item) {
    const d = item || {};
    const typeOpts = [
      ['bestseller', 'Menu bestseller (has price, shows on /menu.html + homepage)'],
      ['signature', 'Signature dish (price-free, homepage only)'],
    ];
    const m = buildModalForm({
      kind: 'dishes',
      title: d.id ? 'Edit dish' : 'Add dish',
      item: d,
      body:
        '<div class="field" data-field-wrap="name"><label>Dish name <span class="req">*</span></label>' +
        '<input type="text" name="name" value="' + esc(d.name || '') + '"><p class="field-error" data-error="name"></p></div>' +
        '<div class="field" data-field-wrap="type"><label>Type</label>' +
        '<select name="type">' + typeOpts.map(function (t) {
          return '<option value="' + t[0] + '"' + (d.type === t[0] ? ' selected' : '') + '>' + esc(t[1]) + '</option>';
        }).join('') + '</select><p class="field-error" data-error="type"></p></div>' +
        '<div class="field" data-field-wrap="price"><label>Price</label>' +
        '<input type="text" name="price" value="' + esc(d.price || '') + '" placeholder="e.g. Rs 545">' +
        '<p class="hint">Signature dishes have no price and show "Reserve to Taste".</p>' +
        '<p class="field-error" data-error="price"></p></div>' +
        '<div class="field" data-field-wrap="category"><label>Category</label>' +
        '<input type="text" name="category" value="' + esc(d.category || '') + '" placeholder="Platters / Snacks & Pizza / Cocktails & Hookah">' +
        '<p class="field-error" data-error="category"></p></div>' +
        '<div class="field" data-field-wrap="badge"><label>Badge</label>' +
        '<input type="text" name="badge" value="' + esc(d.badge || '') + '" placeholder="e.g. Chef Special">' +
        '<p class="field-error" data-error="badge"></p></div>' +
        '<div class="field" data-field-wrap="description"><label>Description</label>' +
        '<textarea name="description" rows="3">' + esc(d.description || '') + '</textarea>' +
        '<p class="field-error" data-error="description"></p></div>' +
        '<details class="np-collapse"><summary>Nepali translation (optional)</summary>' +
        '<div class="np-fields">' +
        '<div class="field" data-field-wrap="name_np"><label>Dish name (नेपाली)</label>' +
        '<input type="text" name="name_np" value="' + esc(d.name_np || '') + '">' +
        '<p class="field-error" data-error="name_np"></p></div>' +
        '<div class="field" data-field-wrap="category_np"><label>Category (नेपाली)</label>' +
        '<input type="text" name="category_np" value="' + esc(d.category_np || '') + '">' +
        '<p class="field-error" data-error="category_np"></p></div>' +
        '<div class="field" data-field-wrap="badge_np"><label>Badge (नेपाली)</label>' +
        '<input type="text" name="badge_np" value="' + esc(d.badge_np || '') + '">' +
        '<p class="field-error" data-error="badge_np"></p></div>' +
        '<div class="field" data-field-wrap="description_np"><label>Description (नेपाली)</label>' +
        '<textarea name="description_np" rows="3">' + esc(d.description_np || '') + '</textarea>' +
        '<p class="hint">Shown to visitors when they switch the website to Nepali.</p>' +
        '<p class="field-error" data-error="description_np"></p></div>' +
        '</div></details>' +
        '<div class="field" data-field-wrap="sort_order"><label>Display order</label>' +
        '<input type="number" name="sort_order" value="' + esc(d.sort_order != null ? d.sort_order : 0) + '">' +
        '<p class="field-error" data-error="sort_order"></p></div>' +
        imageFieldBlock(d.image_url, 'dish') +
        '<div class="check-row"><label class="check"><input type="checkbox" name="is_visible" ' + (Number(d.is_visible) !== 0 ? 'checked' : '') + '> Visible on website</label></div>' +
        '<div class="check-row"><label class="check"><input type="checkbox" name="is_featured" ' + (Number(d.is_featured) === 1 ? 'checked' : '') + '> Featured</label></div>',
    });
    if (!m) return;
    const el = m.el;
    wireImageButtons(el, 'dish', function (url) { setImageUrl(el, url); });
    el.querySelector('form').addEventListener('submit', async function (e) {
      e.preventDefault();
      clearErrors(el);
      const fd = new FormData(el.querySelector('form'));
      const body = Object.fromEntries(fd.entries());
      body.is_visible = el.querySelector('[name="is_visible"]').checked ? 1 : 0;
      body.is_featured = el.querySelector('[name="is_featured"]').checked ? 1 : 0;
      body.sort_order = Number(body.sort_order || 0);
      const r = await api('/admin/api/dishes/save', { body: body });
      if (!r.ok) { showErrors(el, r.errors || { _: r.error }); if (!r.errors) toast(r.error, 'error'); return; }
      toast('Dish saved as draft.');
      m.close();
      refreshList('dishes');
      refreshDraftBar();
    });
  }

  function openReviewModal(item) {
    const rv = item || {};
    const ratingOpts = [5, 4, 3, 2, 1].map(function (n) {
      return '<option value="' + n + '"' + (Number(rv.rating) === n ? ' selected' : '') + '>' + n + ' stars</option>';
    }).join('');
    const m = buildModalForm({
      kind: 'reviews',
      title: rv.id ? 'Edit review' : 'Add review',
      item: rv,
      body:
        '<div class="field" data-field-wrap="name"><label>Reviewer name <span class="req">*</span></label>' +
        '<input type="text" name="name" value="' + esc(rv.name || '') + '"><p class="field-error" data-error="name"></p></div>' +
        '<div class="field" data-field-wrap="name_np"><label>Reviewer name (नेपाली) <span class="req">*</span></label>' +
        '<input type="text" name="name_np" value="' + esc(rv.name_np || '') + '">' +
        '<p class="field-error" data-error="name_np"></p></div>' +
        '<div class="field" data-field-wrap="rating"><label>Rating</label>' +
        '<select name="rating">' + ratingOpts + '</select><p class="field-error" data-error="rating"></p></div>' +
        '<div class="field" data-field-wrap="text"><label>Review text <span class="req">*</span></label>' +
        '<textarea name="text" rows="4">' + esc(rv.text || '') + '</textarea>' +
        '<p class="hint">Demo reviews are clearly labelled and safe to replace or remove.</p>' +
        '<p class="field-error" data-error="text"></p></div>' +
        '<div class="field" data-field-wrap="text_np"><label>Review text (नेपाली) <span class="req">*</span></label>' +
        '<textarea name="text_np" rows="4">' + esc(rv.text_np || '') + '</textarea>' +
        '<p class="hint">Required — shown when the website language is Nepali. Every visible review must have Nepali content; publishing an English-only review is blocked.</p>' +
        '<p class="field-error" data-error="text_np"></p></div>' +
        '<div class="field"><label>Reviewer photo</label>' +
        '<div class="upload-block">' +
        (rv.image_url ? '<div class="upload-preview round"><img src="' + esc(rv.image_url) + '" alt=""></div>' : '') +
        '<div class="upload-buttons">' +
        '<button class="btn btn-ghost btn-small" type="button" data-upload="review">Upload photo</button>' +
        (rv.image_url ? '<button class="btn btn-ghost btn-small" type="button" data-remove-image>Remove photo</button>' : '') +
        '</div>' +
        '</div>' +
        '<input type="hidden" name="image_url" value="' + esc(rv.image_url || '') + '">' +
        '<p class="hint">The photo is cropped to a consistent circular profile shape — zoom and reposition instead of editing the file externally.</p>' +
        '<p class="field-error" data-error="image_url"></p></div>' +
        '<div class="check-row"><label class="check"><input type="checkbox" name="is_visible" ' + (Number(rv.is_visible) !== 0 ? 'checked' : '') + '> Visible on website</label></div>',
    });
    if (!m) return;
    const el = m.el;
    const uploadBtn = el.querySelector('[data-upload="review"]');
    if (uploadBtn) {
      uploadBtn.addEventListener('click', function () {
        const input = hiddenFileInput();
        input.addEventListener('change', function () {
          const file = input.files[0];
          if (!file) return;
          if (!file.type.startsWith('image/')) { toast('Please choose an image file.', 'error'); return; }
          if (file.size > 8 * 1024 * 1024) { toast('Image must be under 8 MB.', 'error'); return; }
          uploadImage(file, '').then(function (r) {
            if (!r.ok) { toast(r.error || 'Upload failed.', 'error'); return; }
            openCropEditor(r.url, function (croppedUrl) {
              setImageUrl(el, croppedUrl);
              updatePhotoPreview(el, croppedUrl);
              api('/admin/api/media/prune', { body: { url: r.url } });
            });
          });
        });
        input.click();
      });
    }
    wireRemoveImage(el);
    el.querySelector('form').addEventListener('submit', async function (e) {
      e.preventDefault();
      clearErrors(el);
      const fd = new FormData(el.querySelector('form'));
      const body = Object.fromEntries(fd.entries());
      body.is_visible = el.querySelector('[name="is_visible"]').checked ? 1 : 0;
      body.rating = Number(body.rating || 5);
      if (Number(body.is_visible) === 1) {
        const localErrors = {};
        if (!String(body.name_np || '').trim()) localErrors.name_np = 'Reviewer name (नेपाली) is required for a visible review.';
        if (!String(body.text_np || '').trim()) localErrors.text_np = 'Review text (नेपाली) is required for a visible review.';
        if (Object.keys(localErrors).length) {
          showErrors(el, localErrors);
          toast('Nepali content is required for visible reviews.', 'error');
          return;
        }
      }
      const r = await api('/admin/api/reviews/save', { body: body });
      if (!r.ok) { showErrors(el, r.errors || { _: r.error }); if (!r.errors) toast(r.error, 'error'); return; }
      toast('Review saved as draft.');
      m.close();
      refreshList('reviews');
      refreshDraftBar();
    });
  }

  function openGalleryModal(item) {
    const g = item || {};
    const m = buildModalForm({
      kind: 'gallery',
      title: g.id ? 'Edit gallery image' : 'Add gallery image',
      item: g,
      body:
        imageFieldBlock(g.image_url, 'gallery') +
        '<div class="field" data-field-wrap="alt"><label>Alt text</label>' +
        '<input type="text" name="alt" value="' + esc(g.alt || '') + '">' +
        '<p class="field-error" data-error="alt"></p></div>' +
        '<div class="check-row"><label class="check"><input type="checkbox" name="is_visible" ' + (Number(g.is_visible) !== 0 ? 'checked' : '') + '> Visible on website</label></div>',
    });
    if (!m) return;
    const el = m.el;
    wireImageButtons(el, 'gallery', function (url) { setImageUrl(el, url); updatePhotoPreview(el, url); });
    el.querySelector('form').addEventListener('submit', async function (e) {
      e.preventDefault();
      clearErrors(el);
      const fd = new FormData(el.querySelector('form'));
      const body = Object.fromEntries(fd.entries());
      body.is_visible = el.querySelector('[name="is_visible"]').checked ? 1 : 0;
      body.is_featured = 0;
      body.sort_order = Number(g.sort_order || 0);
      const r = await api('/admin/api/gallery/save', { body: body });
      if (!r.ok) { showErrors(el, r.errors || { _: r.error }); if (!r.errors) toast(r.error, 'error'); return; }
      toast('Gallery image saved as draft.');
      m.close();
      refreshList('gallery');
      refreshDraftBar();
    });
  }

  function setImageUrl(el, url) {
    const input = el.querySelector('[name="image_url"]');
    if (input) input.value = url;
  }

  function updatePhotoPreview(el, url) {
    const block = el.querySelector('.upload-block');
    if (!block) return;
    let prev = block.querySelector('.upload-preview');
    if (!prev) {
      prev = document.createElement('div');
      prev.className = 'upload-preview';
      block.prepend(prev);
    }
    prev.innerHTML = '<img src="' + esc(url) + '" alt="">';
    const rem = block.querySelector('[data-remove-image]');
    if (!rem) {
      const btn = document.createElement('button');
      btn.className = 'btn btn-ghost btn-small';
      btn.type = 'button';
      btn.setAttribute('data-remove-image', '');
      btn.textContent = 'Remove';
      block.querySelector('.upload-buttons').appendChild(btn);
      wireRemoveImage(el);
    }
  }

  function wireImageButtons(el, name, onUrl) {
    const btn = el.querySelector('[data-upload="' + name + '"]');
    if (btn) {
      btn.addEventListener('click', function () {
        const input = hiddenFileInput();
        input.addEventListener('change', function () {
          const file = input.files[0];
          if (!file) return;
          if (!file.type.startsWith('image/')) { toast('Please choose an image file.', 'error'); return; }
          if (file.size > 8 * 1024 * 1024) { toast('Image must be under 8 MB.', 'error'); return; }
          uploadImage(file, '').then(function (r) {
            if (!r.ok) { toast(r.error || 'Upload failed.', 'error'); return; }
            const prevInput = el.querySelector('[name="image_url"]');
            const old = prevInput ? prevInput.value : '';
            onUrl(r.url);
            if (old && old.indexOf('/uploads/') === 0 && old !== r.url) {
              api('/admin/api/media/prune', { body: { url: old } });
            }
          });
        });
        input.click();
      });
    }
    wireRemoveImage(el);
  }

  function wireRemoveImage(el) {
    el.querySelectorAll('[data-remove-image]').forEach(function (btn) {
      if (btn.dataset.bound) return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', function () {
        const prevInput = el.querySelector('[name="image_url"]');
        const old = prevInput ? prevInput.value : '';
        if (prevInput) prevInput.value = '';
        const block = el.querySelector('.upload-block');
        const prev = block ? block.querySelector('.upload-preview') : null;
        if (prev) prev.remove();
        btn.remove();
        if (old && old.indexOf('/uploads/') === 0) {
          api('/admin/api/media/prune', { body: { url: old } });
        }
        toast('Photo removed.');
      });
    });
  }

  /* ---------------- Table CRUD actions ---------------- */

  function rowFor(btn) {
    const tr = btn.closest('tr');
    const data = pageData();
    if (tr && data) return findItem(data.items, tr.dataset.row);
    return null;
  }

  function tileFor(btn) {
    const tile = btn.closest('.gallery-tile');
    const data = pageData();
    if (tile && data) return findItem(data.items, tile.dataset.row);
    return null;
  }

  async function toggleItem(kind, item) {
    const base = {
      row_id: item.id || '',
      draft_id: item.draft_id || '',
      is_visible: Number(item.is_visible) === 1 ? 0 : 1,
    };
    let body;
    if (kind === 'dishes') {
      body = Object.assign(base, {
        type: item.type, name: item.name, description: item.description, price: item.price,
        category: item.category, badge: item.badge, image_url: item.image_url,
        is_featured: Number(item.is_featured), sort_order: Number(item.sort_order || 0),
      });
    } else if (kind === 'reviews') {
      body = Object.assign(base, {
        name: item.name, text: item.text, rating: Number(item.rating || 5),
        name_np: item.name_np || '', text_np: item.text_np || '',
        image_url: item.image_url, sort_order: Number(item.sort_order || 0),
      });
    } else {
      body = Object.assign(base, {
        image_url: item.image_url, alt: item.alt, is_featured: Number(item.is_featured || 0),
        sort_order: Number(item.sort_order || 0),
      });
    }
    const r = await api('/admin/api/' + kind + '/save', { body: body });
    if (!r.ok) { toast(r.error || 'Could not update visibility.', 'error'); return; }
    toast('Visibility updated (draft).');
    refreshList(kind);
    refreshDraftBar();
  }

  async function deleteItem(kind, item) {
    const ok = await confirmDialog({
      title: 'Delete ' + kind.slice(0, -1) + '?',
      message: 'This will be removed from the website when you publish. Original content can still be restored.',
      confirmText: 'Delete',
    });
    if (!ok) return;
    const r = await api('/admin/api/' + kind + '/delete', {
      body: { row_id: item.id || '', draft_id: item.draft_id || '' },
    });
    if (!r.ok) { toast(r.error || 'Could not delete.', 'error'); return; }
    toast(kind.slice(0, -1) + ' marked for deletion.');
    refreshList(kind);
    refreshDraftBar();
  }

  async function restoreRow(kind, item) {
    if (!item.id) return;
    const ok = await confirmDialog({
      title: 'Restore original?',
      message: 'This restores the protected ORIGINAL values for this item. It is staged as a draft until you publish.',
      confirmText: 'Restore original',
    });
    if (!ok) return;
    const r = await api('/admin/api/' + kind + '/restore', { body: { id: item.id } });
    if (!r.ok) { toast(r.error || 'No original version exists.', 'error'); return; }
    toast('Restored to original (draft).');
    refreshList(kind);
    refreshDraftBar();
  }

  /* ---------------- Gallery reorder ---------------- */

  function wireGalleryReorder() {
    const grid = document.querySelector('.gallery-grid');
    if (!grid) return;
    let dragSrc = null;
    grid.addEventListener('dragstart', function (e) {
      dragSrc = e.target.closest('.gallery-tile');
      if (!dragSrc) return;
      e.dataTransfer.effectAllowed = 'move';
      dragSrc.classList.add('is-dragging');
    });
    grid.addEventListener('dragend', function () {
      if (dragSrc) dragSrc.classList.remove('is-dragging');
      dragSrc = null;
    });
    grid.addEventListener('dragover', function (e) { e.preventDefault(); });
    grid.addEventListener('drop', async function (e) {
      e.preventDefault();
      const target = e.target.closest('.gallery-tile');
      if (!target || !dragSrc || target === dragSrc) return;
      const kids = Array.from(grid.children);
      const from = kids.indexOf(dragSrc);
      const to = kids.indexOf(target);
      if (from < to) target.after(dragSrc); else target.before(dragSrc);
      const tiles = Array.from(grid.children);
      const order = tiles.map(function (t) {
        return { id: t.dataset.id || '', draft_id: t.dataset.draftId || '' };
      });
      const r = await api('/admin/api/gallery/reorder', { body: { order: order } });
      if (!r.ok) { toast(r.error || 'Could not save the new order.', 'error'); return; }
      toast('Gallery order saved.');
      refreshList('gallery');
      refreshDraftBar();
    });
  }

  /* ---------------- Hours ---------------- */

  function wireHours() {
    const saveBtn = document.querySelector('[data-hours-save]');
    if (!saveBtn) return;
    const rows = Array.from(document.querySelectorAll('[data-table="hours"] tr[data-day]'));
    rows.forEach(function (tr) {
      const idx = tr.dataset.day;
      const open = tr.querySelector('[data-hours-open="' + idx + '"]');
      const t1 = tr.querySelector('[data-hours-open-time="' + idx + '"]');
      const t2 = tr.querySelector('[data-hours-close-time="' + idx + '"]');
      function sync() {
        const on = open.checked;
        t1.disabled = !on;
        t2.disabled = !on;
        if (!on) { t1.value = ''; t2.value = ''; }
      }
      open.addEventListener('change', sync);
      sync();
    });
    saveBtn.addEventListener('click', async function () {
      const days = rows.map(function (tr) {
        const idx = Number(tr.dataset.day);
        const open = tr.querySelector('[data-hours-open="' + idx + '"]');
        const t1 = tr.querySelector('[data-hours-open-time="' + idx + '"]');
        const t2 = tr.querySelector('[data-hours-close-time="' + idx + '"]');
        return {
          day_index: idx,
          is_open: open.checked ? 1 : 0,
          open_time: open.checked ? t1.value : '',
          close_time: open.checked ? t2.value : '',
        };
      });
      const r = await api('/admin/api/hours/save', { body: { days: days } });
      const errWrap = document.querySelector('[data-error="hours"]');
      if (!r.ok) {
        if (errWrap) {
          errWrap.textContent = r.errors
            ? Object.values(r.errors)[0]
            : (r.error || 'Could not save hours.');
        }
        return;
      }
      if (errWrap) errWrap.textContent = '';
      toast('Opening hours saved as draft.');
      refreshDraftBar();
    });
    document.querySelectorAll('[data-hours-restore]').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        const day = Number(btn.getAttribute('data-hours-restore'));
        confirmDialog({
          title: 'Restore original hours?',
          message: 'This restores the protected ORIGINAL schedule for this day. It is staged as a draft until you publish.',
          confirmText: 'Restore',
          danger: true,
        }, async function () {
          const r = await api('/admin/api/restore-original', { body: { kind: 'hours', id: day } });
          if (!r.ok) { toast(r.error || 'Could not restore hours.', 'error'); return; }
          setTimeout(function () { location.reload(); }, 150);
          toast('Opening hours restored to original.');
        });
      });
    });
  }

  /* ---------------- Settings ---------------- */

  function wireSettings() {
    const form = document.getElementById('settingsForm');
    if (!form) return;

    function syncSwatches() {
      form.querySelectorAll('[data-color-text]').forEach(function (text) {
        const swatch = form.querySelector('[data-color-swatch]');
        if (swatch) {
          const v = (text.value || '').trim();
          swatch.value = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v) ? (/^#/.test(v) ? v : '#' + v) : swatch.value;
        }
      });
    }
    form.querySelectorAll('[data-color-text]').forEach(function (text) {
      text.addEventListener('input', syncSwatches);
    });
    form.querySelectorAll('[data-color-swatch]').forEach(function (swatch) {
      swatch.addEventListener('input', function () {
        const text = form.querySelector('[data-color-text]');
        if (text) text.value = swatch.value;
      });
    });

    form.addEventListener('click', function (e) {
      const restore = e.target.closest('[data-restore]');
      if (!restore) return;
      const key = restore.getAttribute('data-restore');
      api('/admin/api/settings/restore', { body: { key: key } }).then(function (r) {
        if (!r.ok) { toast(r.error || 'Could not restore.', 'error'); return; }
        const input = form.querySelector('[data-field="' + key + '"]');
        if (input) input.value = r.value || '';
        syncSwatches();
        const preview = form.querySelector('[data-preview="' + key + '"]');
        if (preview && r.value) preview.src = r.value;
        toast('Restored to original value.');
        refreshDraftBar();
      });
    });

    /* Image upload buttons — driven by the field key so any image setting
       (hero image, website logo, ...) reuses the same flow. */
    form.querySelectorAll('[data-upload-input]').forEach(function (uploadInput) {
      const key = uploadInput.getAttribute('data-upload-input');
      const label = (form.querySelector('label[for="' + key + '"]') || {}).textContent || key;
      const niceName = label.replace('Restore original', '').trim().toLowerCase() || key;
      uploadInput.addEventListener('click', function () {
        const input = hiddenFileInput();
        input.addEventListener('change', function () {
          const file = input.files[0];
          if (!file) return;
          if (!file.type.startsWith('image/')) { toast('Please choose an image file.', 'error'); return; }
          if (file.size > 8 * 1024 * 1024) { toast('Image must be under 8 MB.', 'error'); return; }
          uploadImage(file, niceName).then(function (r) {
            if (!r.ok) { toast(r.error || 'Upload failed.', 'error'); return; }
            const field = form.querySelector('[data-field="' + key + '"]');
            if (field) field.value = r.url;
            const box = form.querySelector('[data-field-wrap="' + key + '"] .img-preview');
            if (box) {
              box.innerHTML = '<img src="' + esc(r.url) + '" alt="' + esc(niceName) + ' preview" data-preview="' + esc(key) + '">';
            }
            toast('Image uploaded. Save the settings to keep it.');
          });
        });
        input.click();
      });
    });

    form.querySelectorAll('[data-submit]').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        clearErrors(form);
        const values = {};
        form.querySelectorAll('[data-field]').forEach(function (el) {
          values[el.getAttribute('data-field')] = el.value;
        });
        const r = await api('/admin/api/settings/save', { body: values });
        if (!r.ok) {
          if (r.errors) showErrors(form, r.errors);
          else toast(r.error || 'Unable to save settings. Please try again.', 'error');
          return;
        }
        if (btn.getAttribute('data-submit') === 'publish') {
          const p = await api('/admin/api/publish', { body: {} });
          if (!p.ok) {
            if (p.problems && p.problems.length) toast('Publish blocked: ' + p.problems.join(' '), 'error');
            else toast(p.error || 'Saved, but publishing failed.', 'error');
            return;
          }
          toast('Settings published successfully.');
        } else {
          toast('Settings saved as draft.');
        }
        refreshDraftBar();
      });
    });
  }

  /* ---------------- Global draft bar ---------------- */

  async function refreshDraftBar() {
    const bar = document.getElementById('draftBar');
    if (!bar) return;
    const r = await api('/admin/api/status', { method: 'GET' });
    if (!r.ok || !r.draft) return;
    const count = r.draft.count;
    const label = document.getElementById('draftLabel');
    if (label) {
      label.textContent = count > 0 ? count + ' unpublished change' + (count === 1 ? '' : 's') : 'All changes published';
    }
    bar.classList.toggle('is-dirty', count > 0);
    bar.dataset.count = count;
    bar.querySelectorAll('[data-action="publish"], [data-action="discard"]').forEach(function (b) {
      b.disabled = count === 0;
    });
  }

  async function refreshAfterGlobalAction() {
    const refreshed = await refreshCurrentList();
    if (refreshed) {
      refreshDraftBar();
    } else {
      setTimeout(function () { location.reload(); }, 120);
    }
  }

  async function publishChanges() {
    const r = await api('/admin/api/publish', { body: {} });
    if (!r.ok) {
      if (r.problems && r.problems.length) {
        toast('Publish blocked: ' + r.problems.join(' '), 'error');
      } else {
        toast(r.error || 'Publish failed.', 'error');
      }
      return;
    }
    toast('Changes published successfully.');
    refreshAfterGlobalAction();
  }

  async function discardDrafts() {
    const ok = await confirmDialog({
      title: 'Discard all drafts?',
      message: 'All unpublished changes will be thrown away. Published content stays untouched.',
      confirmText: 'Discard drafts',
    });
    if (!ok) return;
    const r = await api('/admin/api/discard', { body: {} });
    if (!r.ok) { toast(r.error || 'Could not discard drafts.', 'error'); return; }
    toast('Drafts discarded.');
    refreshAfterGlobalAction();
  }

  async function undoNow() {
    const r = await api('/admin/api/undo', { body: {} });
    if (!r.ok) { toast(r.error || 'Nothing to undo.', 'error'); return; }
    toast('Undone — previous state restored.');
    refreshAfterGlobalAction();
  }

  async function redoNow() {
    const r = await api('/admin/api/redo', { body: {} });
    if (!r.ok) { toast(r.error || 'Nothing to redo.', 'error'); return; }
    toast('Redone — state restored.');
    refreshAfterGlobalAction();
  }

  function saveAsOriginalFlow() {
    const m = openModal(
      '<h3>Save current site as the original</h3>' +
      '<p>This makes the site <strong>exactly as it looks right now</strong> the protected ORIGINAL. ' +
      'From now on, "Reset entire website" will restore to this version instead of the old demo content.</p>' +
      '<p>Do this once your real photos, dishes and reviews are live.</p>' +
      '<div class="field"><label for="saveOrigConfirm">Type SAVE to confirm</label>' +
      '<input id="saveOrigConfirm" type="text" autocomplete="off" data-saveorig-input>' +
      '<p class="field-error" data-error="saveorig"></p></div>' +
      '<div class="modal-actions">' +
      '<button class="btn btn-ghost" data-close-modal type="button">Cancel</button>' +
      '<button class="btn btn-gold" data-saveorig-go type="button" disabled>Save as original</button>' +
      '</div>',
      { size: 'modal-sm' }
    );
    const input = m.el.querySelector('[data-saveorig-input]');
    const go = m.el.querySelector('[data-saveorig-go]');
    const err = m.el.querySelector('[data-error="saveorig"]');
    input.addEventListener('input', function () {
      go.disabled = input.value.trim() !== 'SAVE';
      err.textContent = '';
    });
    go.addEventListener('click', async function () {
      const r = await api('/admin/api/save-as-original', { body: { confirm: input.value.trim() } });
      if (!r.ok) { err.textContent = r.error || 'Could not save as original.'; return; }
      toast('Saved. Reset will now restore the site to how it looks today.');
      m.close();
      refreshAfterGlobalAction();
    });
  }

  function resetFlow() {
    const m = openModal(
      '<h3>Reset entire website</h3>' +
      '<p>This restores <strong>all</strong> content to the protected ORIGINAL baseline — settings, dishes, reviews, reviewer photos, gallery, opening hours and social links. Your current changes will be replaced.</p>' +
      '<div class="field"><label for="resetConfirm">Type RESET to confirm</label>' +
      '<input id="resetConfirm" type="text" autocomplete="off" data-reset-input>' +
      '<p class="field-error" data-error="reset"></p></div>' +
      '<div class="modal-actions">' +
      '<button class="btn btn-ghost" data-close-modal type="button">Cancel</button>' +
      '<button class="btn btn-danger" data-reset-go type="button" disabled>Reset everything</button>' +
      '</div>',
      { size: 'modal-sm' }
    );
    const input = m.el.querySelector('[data-reset-input]');
    const go = m.el.querySelector('[data-reset-go]');
    const err = m.el.querySelector('[data-error="reset"]');
    input.addEventListener('input', function () {
      go.disabled = input.value.trim() !== 'RESET';
      err.textContent = '';
    });
    go.addEventListener('click', async function () {
      const r = await api('/admin/api/reset', { body: { confirm: input.value.trim() } });
      if (!r.ok) { err.textContent = r.error || 'Reset failed.'; return; }
      toast('Website successfully restored to the original baseline.');
      m.close();
      refreshAfterGlobalAction();
    });
  }

  /* ---------------- Global event wiring ---------------- */

  document.addEventListener('click', function (e) {
    const actionBtn = e.target.closest('[data-action]');
    if (actionBtn) {
      const action = actionBtn.getAttribute('data-action');
      if (action === 'publish') publishChanges();
      else if (action === 'save-as-original') saveAsOriginalFlow();
      else if (action === 'discard') discardDrafts();
      else if (action === 'undo') undoNow();
      else if (action === 'redo') redoNow();
      else if (action === 'reset') resetFlow();
      return;
    }

    const table = e.target.closest('[data-table]');
    if (table) {
      const kind = table.getAttribute('data-table');
      const data = pageData();
      const editBtn = e.target.closest('[data-edit]');
      const toggleBtn = e.target.closest('[data-toggle]');
      const delBtn = e.target.closest('[data-delete]');
      const restBtn = e.target.closest('[data-restore-row]');
      const featBtn = e.target.closest('[data-feature]');

      if (editBtn) {
        const item = findItem(data && data.items, editBtn.getAttribute('data-edit'));
        if (kind === 'dishes') openDishModal(item);
        else if (kind === 'reviews') openReviewModal(item);
        else if (kind === 'gallery') openGalleryModal(item);
        return;
      }
      if (toggleBtn) {
        const item = findItem(data && data.items, toggleBtn.getAttribute('data-toggle'));
        if (item) toggleItem(kind, item);
        return;
      }
      if (delBtn) {
        const item = findItem(data && data.items, delBtn.getAttribute('data-delete'));
        if (item) deleteItem(kind, item);
        return;
      }
      if (restBtn) {
        const item = findItem(data && data.items, restBtn.getAttribute('data-restore-row'));
        if (item) restoreRow(kind, item);
        return;
      }
      if (featBtn) {
        const item = findItem(data && data.items, featBtn.getAttribute('data-feature'));
        if (item) {
          api('/admin/api/gallery/save', {
            body: {
              row_id: item.id || '', draft_id: item.draft_id || '',
              image_url: item.image_url, alt: item.alt,
              is_featured: 1, is_visible: Number(item.is_visible),
              sort_order: Number(item.sort_order || 0),
            },
          }).then(function (r) {
            if (!r.ok) { toast(r.error || 'Could not set featured image.', 'error'); return; }
            toast('Featured image set (draft).');
            refreshList('gallery');
            refreshDraftBar();
          });
        }
        return;
      }
      if (e.target.closest('[data-dish-new]')) { openDishModal(null); return; }
      if (e.target.closest('[data-review-new]')) { openReviewModal(null); return; }
    }

    const newBtn = e.target.closest('[data-dish-new]');
    if (newBtn) { openDishModal(null); return; }
    const newReview = e.target.closest('[data-review-new]');
    if (newReview) { openReviewModal(null); return; }

    const uploadLabel = e.target.closest('[data-gallery-upload]');
    if (uploadLabel) {
      const input = hiddenFileInput();
      // Photographing a restaurant produces a batch, not one picture. Uploading
      // them one at a time — choose, wait, repeat — is why the gallery stayed
      // full of stock photos, so the picker takes the whole set at once.
      input.multiple = true;
      input.addEventListener('change', async function () {
        const files = Array.prototype.slice.call(input.files || []);
        if (!files.length) return;

        const valid = [];
        const rejected = [];
        files.forEach(function (f) {
          if (!f.type || !f.type.startsWith('image/')) rejected.push(f.name + ' (not an image)');
          else if (f.size > 8 * 1024 * 1024) rejected.push(f.name + ' (over 8 MB)');
          else valid.push(f);
        });
        rejected.forEach(function (msg) { toast('Skipped ' + msg, 'error'); });
        if (!valid.length) return;

        // Uploaded in sequence, not in parallel: a phone on mobile data pushing
        // fifteen photos at once tends to have some of them time out.
        let added = 0;
        const failed = [];
        for (let i = 0; i < valid.length; i++) {
          const file = valid[i];
          if (valid.length > 1) toast('Uploading ' + (i + 1) + ' of ' + valid.length + '…');
          try {
            const r = await uploadImage(file, '');
            if (!r.ok) { failed.push(file.name); continue; }
            const c = await api('/admin/api/gallery/create', { body: { image_url: r.url, alt: '', is_visible: 1 } });
            if (!c.ok) { failed.push(file.name); continue; }
            added++;
          } catch (err) {
            failed.push(file.name);
          }
        }

        // Report the real outcome — a partial batch must not look like success.
        if (added) {
          toast(added === 1
            ? 'Photo added to the gallery (draft).'
            : added + ' photos added to the gallery (draft).');
        }
        if (failed.length) {
          toast(failed.length + ' could not be uploaded: ' + failed.join(', '), 'error');
        }
        if (added) {
          refreshList('gallery');
          refreshDraftBar();
        }
      });
      input.click();
      return;
    }

    const revRestore = e.target.closest('[data-rev-restore]');
    if (revRestore) {
      const id = revRestore.getAttribute('data-rev-restore');
      confirmDialog({
        title: 'Restore this revision?',
        message: 'The whole website will roll back to the state captured in revision #' + id + '.',
        confirmText: 'Restore revision',
      }).then(function (ok) {
        if (!ok) return;
        api('/admin/api/revisions/restore', { body: { id: Number(id) } }).then(function (r) {
          if (!r.ok) { toast(r.error || 'Could not restore that revision.', 'error'); return; }
          toast('Revision #' + id + ' restored.');
          location.reload();
        });
      });
      return;
    }
  });

  /* ---------------- Admin security ---------------- */

  function wireSecurity() {
    const usernameForm = document.getElementById('usernameForm');
    const passwordForm = document.getElementById('passwordForm');

    function setFieldError(form, key, msg) {
      const wrap = form.querySelector('[data-field-wrap="' + key + '"]');
      const errEl = form.querySelector('[data-error="' + key + '"]');
      if (errEl) errEl.textContent = msg || '';
      if (wrap) wrap.classList.toggle('is-error', Boolean(msg));
    }

    function clearFormErrors(form) {
      form.querySelectorAll('.is-error').forEach(function (w) { w.classList.remove('is-error'); });
      form.querySelectorAll('[data-error]').forEach(function (e) { e.textContent = ''; });
    }

    if (usernameForm) {
      usernameForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        clearFormErrors(usernameForm);
        const body = {
          new_username: usernameForm.querySelector('[name="new_username"]').value,
          current_password: usernameForm.querySelector('[name="current_password"]').value,
        };
        const r = await api('/admin/api/security/username', { body: body });
        if (!r.ok) {
          setFieldError(usernameForm, 'current_password', r.error || 'Could not update the username.');
          toast(r.error || 'Could not update the username.', 'error');
          return;
        }
        toast('Username updated.');
        const field = document.getElementById('currentUsername');
        if (field) field.value = r.username || '';
        usernameForm.querySelector('[name="new_username"]').value = '';
        usernameForm.querySelector('[name="current_password"]').value = '';
      });
    }

    if (passwordForm) {
      passwordForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        clearFormErrors(passwordForm);
        const body = {
          current_password: passwordForm.querySelector('[name="current_password"]').value,
          new_password: passwordForm.querySelector('[name="new_password"]').value,
          confirm_password: passwordForm.querySelector('[name="confirm_password"]').value,
        };
        const r = await api('/admin/api/security/password', { body: body });
        if (!r.ok) {
          setFieldError(passwordForm, 'current_password', r.error || 'Could not change the password.');
          toast(r.error || 'Could not change the password.', 'error');
          return;
        }
        toast('Password changed. Signing you out...');
        setTimeout(function () { window.location.href = '/admin/login?notice=session-invalidated'; }, 900);
      });
    }
  }

  /* ---------------- Init ---------------- */

  function init() {
    wireSettings();
    wireHours();
    wireGalleryReorder();
    wireSecurity();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
