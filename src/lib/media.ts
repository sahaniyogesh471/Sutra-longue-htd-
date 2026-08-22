import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';
import sharp from 'sharp';
import type { DB } from '../db/index.js';

/**
 * Media storage — image binaries live on disk under DATA_DIR/uploads;
 * the `media` table stores metadata only.
 *
 * Upload rules (server-side, never trust the client):
 *  - images only (jpg / png / webp / gif / avif)
 *  - max 8 MB
 *  - random file names (no user-controlled paths)
 */

export const UPLOADS_DIR = path.join(process.cwd(), 'data', 'uploads');
export const UPLOADS_URL_PREFIX = '/uploads';

const MAX_SIZE_BYTES = 8 * 1024 * 1024;

/** Uploaded images are re-encoded to WebP and capped at this size for fast delivery. */
const MAX_IMAGE_WIDTH = 1600;
const MAX_IMAGE_HEIGHT = 1600;
const WEBP_QUALITY = 80;

const MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
};

/** Reads a file's leading bytes and verifies they match the declared MIME type.
 *  The browser-supplied `mimetype` is untrusted, so we never rely on it alone. */
export function validateImageFile(filePath: string, mimetype: string): boolean {
  let fd: number;
  try {
    fd = fs.openSync(filePath, 'r');
  } catch {
    return false;
  }
  try {
    const head = Buffer.alloc(16);
    const read = fs.readSync(fd, head, 0, head.length, 0);
    const b = head.subarray(0, read);

    switch (mimetype) {
      case 'image/jpeg':
        return b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
      case 'image/png':
        return b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a;
      case 'image/gif':
        return b.length >= 4 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38;
      case 'image/webp':
        return (
          b.length >= 12 &&
          b.toString('latin1', 0, 4) === 'RIFF' &&
          b.toString('latin1', 8, 12) === 'WEBP'
        );
      case 'image/avif':
        return (
          b.length >= 12 &&
          b.toString('latin1', 4, 8) === 'ftyp' &&
          (b.toString('latin1', 8, 12) === 'avif' || b.toString('latin1', 8, 12) === 'avis')
        );
      default:
        return false;
    }
  } finally {
    fs.closeSync(fd);
  }
}

export function ensureUploadsDir(): void {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

function randomName(ext: string): string {
  return `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${ext}`;
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureUploadsDir();
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = MIME_EXT[file.mimetype] ?? 'jpg';
    cb(null, randomName(ext));
  },
});

function fileFilter(
  _req: unknown,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void {
  if (MIME_EXT[file.mimetype]) {
    cb(null, true);
    return;
  }
  cb(new Error('Only image files (jpg, png, webp, gif, avif) are allowed.'));
}

export const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE_BYTES, files: 1 },
  fileFilter,
});

export function urlForFile(file: Express.Multer.File): string {
  return `${UPLOADS_URL_PREFIX}/${file.filename}`;
}

export interface OptimizedImage {
  width: number;
  height: number;
}

/**
 * Re-encodes an uploaded image into a compressed WebP capped at MAX_IMAGE_WIDTH/HEIGHT
 * so pages never ship multi-megabyte originals. The original upload is replaced in place:
 * the file's filename/path/mimetype/size are updated to the WebP variant (which is always
 * the best effort — the raw file is removed only after the smaller WebP is written).
 * Returns null when the WebP is not smaller than the original (rare), keeping the original.
 */
/**
 * Confirms the file is a real, decodable image rather than something that
 * merely starts with the right magic bytes — a text file beginning "GIF89a"
 * passes the header check but is not an image.
 *
 * Not exploitable on this stack (no interpreter runs uploaded files, and they
 * are served with `X-Content-Type-Options: nosniff`), but rejecting them keeps
 * junk out of storage and is one more layer of defence.
 */
export async function isDecodableImage(filePath: string): Promise<boolean> {
  try {
    const meta = await sharp(filePath, { limitInputPixels: 100 * 1000 * 1000 }).metadata();
    return Boolean(meta.width && meta.height);
  } catch {
    return false;
  }
}

export async function optimizeImageFile(file: Express.Multer.File): Promise<OptimizedImage | null> {
  const ext = path.extname(file.filename).toLowerCase();
  const base = path.basename(file.filename, ext);
  const webpPath = path.join(UPLOADS_DIR, `${base}.webp`);

  let meta: { width: number; height: number; size: number };
  try {
    const output = await sharp(file.path, { limitInputPixels: 100 * 1000 * 1000 })
      .resize({ width: MAX_IMAGE_WIDTH, height: MAX_IMAGE_HEIGHT, fit: 'inside', withoutEnlargement: true })
      .rotate()
      .webp({ quality: WEBP_QUALITY, effort: 4 })
      .toFile(webpPath);
    meta = { width: output.width, height: output.height, size: output.size };
  } catch {
    try {
      fs.rmSync(webpPath, { force: true });
    } catch {
      /* best effort */
    }
    return null;
  }

  if (meta.size >= file.size) {
    try {
      fs.rmSync(webpPath, { force: true });
    } catch {
      /* best effort */
    }
    return null;
  }

  try {
    fs.rmSync(file.path, { force: true });
  } catch {
    /* best effort */
  }
  file.filename = `${base}.webp`;
  file.path = webpPath;
  file.mimetype = 'image/webp';
  file.size = meta.size;
  return { width: meta.width, height: meta.height };
}

/** Records an uploaded file in the media metadata table. */
export function registerMedia(
  db: DB,
  file: Express.Multer.File,
  alt = '',
  dims?: OptimizedImage | null,
  /** Absolute URL when the image lives on a remote CDN (Cloudinary) rather
   *  than on local disk. Falls back to the local /uploads path. */
  remoteUrl?: string
): number {
  const info = db
    .prepare(
      `INSERT INTO media (file_name, stored_path, url_path, mime_type, size_bytes, width, height, alt, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    )
    .run(
      file.originalname,
      remoteUrl ? '' : file.path,
      remoteUrl ?? urlForFile(file),
      file.mimetype,
      file.size,
      dims?.width ?? null,
      dims?.height ?? null,
      alt
    );
  return Number(info.lastInsertRowid);
}

/**
 * Deletes an uploaded file from disk (and its media rows) when it is no longer
 * referenced anywhere. The original upload is otherwise preserved so that
 * replacing an image never destroys the previously stored file.
 */
export function pruneOrphanMedia(db: DB, urlPath: string | null | undefined): void {
  // Accept both local /uploads paths and remote Cloudinary URLs; the file
  // deletion below is skipped automatically for remote entries because their
  // stored_path is empty.
  if (!urlPath) return;
  const isRemote = urlPath.startsWith('https://res.cloudinary.com/');
  if (!isRemote && !urlPath.startsWith(UPLOADS_URL_PREFIX)) return;
  const refTables = [
    { t: 'gallery', col: 'image_url' },
    { t: 'reviews', col: 'image_url' },
    { t: 'dishes', col: 'image_url' },
    { t: 'gallery_draft', col: 'image_url' },
    { t: 'reviews_draft', col: 'image_url' },
    { t: 'dishes_draft', col: 'image_url' },
  ];
  const used = refTables.some(({ t, col }) =>
    (db.prepare(`SELECT COUNT(*) AS c FROM ${t} WHERE ${col} = ?`).get(urlPath) as { c: number }).c > 0
  );
  const inSettings =
    (db.prepare("SELECT COUNT(*) AS c FROM settings WHERE value = ?").get(urlPath) as { c: number }).c +
    (db.prepare("SELECT COUNT(*) AS c FROM settings_draft WHERE value = ?").get(urlPath) as { c: number }).c +
    (db.prepare("SELECT COUNT(*) AS c FROM settings_baseline WHERE value = ?").get(urlPath) as { c: number }).c;
  if (used || inSettings > 0) return;

  const rows = db.prepare('SELECT id, stored_path FROM media WHERE url_path = ?').all(urlPath) as { id: number; stored_path: string }[];
  const remove = db.prepare('DELETE FROM media WHERE id = ?');
  for (const row of rows) {
    remove.run(row.id);
    const full = path.resolve(row.stored_path);
    if (full.startsWith(path.resolve(UPLOADS_DIR))) {
      try {
        fs.rmSync(full, { force: true });
      } catch {
        /* best effort — a missing file is not fatal */
      }
    }
  }
}
