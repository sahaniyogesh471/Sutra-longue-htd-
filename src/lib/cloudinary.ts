/**
 * Cloudinary media storage.
 *
 * Render's free instances have an ephemeral filesystem, so anything written to
 * data/uploads/ disappears on the next redeploy. When Cloudinary credentials
 * are configured, uploaded images are pushed to Cloudinary instead and the
 * database stores the returned CDN URL, so photos survive restarts.
 *
 * Without credentials every helper here is inert and the caller falls back to
 * local disk storage, which is what local development uses.
 */
import fs from 'node:fs';
import { v2 as cloudinary } from 'cloudinary';
import {
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_ENABLED,
} from '../config.js';

if (CLOUDINARY_ENABLED) {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export const cloudinaryEnabled = CLOUDINARY_ENABLED;

/** Folder all uploads are grouped under, so the media library stays tidy. */
const FOLDER = 'sutra-lounge';

export interface CloudinaryUpload {
  url: string;
  publicId: string;
  width: number;
  height: number;
  bytes: number;
  format: string;
}

/**
 * Uploads a local file to Cloudinary and returns its CDN URL.
 *
 * Cloudinary performs the resize/compression that `sharp` does locally:
 * images are capped at 1600px and converted to the best format the requesting
 * browser supports (usually WebP or AVIF), so delivery stays fast.
 */
export async function uploadToCloudinary(
  filePath: string,
  originalName: string
): Promise<CloudinaryUpload> {
  if (!CLOUDINARY_ENABLED) {
    throw new Error('Cloudinary is not configured.');
  }

  const result = await cloudinary.uploader.upload(filePath, {
    folder: FOLDER,
    resource_type: 'image',
    // Let Cloudinary pick the filename; never trust the client's.
    use_filename: false,
    unique_filename: true,
    overwrite: false,
    transformation: [
      { width: 1600, height: 1600, crop: 'limit' },
      { quality: 'auto:good', fetch_format: 'auto' },
    ],
    context: originalName ? { original: originalName.slice(0, 100) } : undefined,
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
    bytes: result.bytes,
    format: result.format,
  };
}

/** Extracts the Cloudinary public_id from a delivery URL, or null. */
export function publicIdFromUrl(url: string): string | null {
  if (!url.includes('res.cloudinary.com')) return null;
  // .../upload/v1234567890/sutra-lounge/abc123.webp -> sutra-lounge/abc123
  const m = /\/upload\/(?:[^/]+\/)*?v\d+\/(.+?)\.[a-z0-9]+$/i.exec(url);
  return m ? m[1] : null;
}

/** Best-effort delete so removed images do not consume the free quota. */
export async function deleteFromCloudinary(url: string): Promise<void> {
  if (!CLOUDINARY_ENABLED) return;
  const publicId = publicIdFromUrl(url);
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
  } catch {
    // Never let cleanup failures break an admin action.
  }
}

/** Removes a temporary local file after it has been uploaded. */
export function cleanupTempFile(filePath: string): void {
  try {
    fs.rmSync(filePath, { force: true });
  } catch {
    /* best effort */
  }
}
