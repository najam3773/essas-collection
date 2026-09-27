import crypto from 'node:crypto';
import path from 'node:path';
import { AppError } from './errors.js';

export type StoredProductImage = { url: string; alt?: string };

export type IncomingImageFile = {
  filename?: string;
  originalname: string;
  mimetype: string;
  path?: string;
  buffer?: Buffer;
};

/**
 * Product image storage driver.
 * Local disk is the default in development.
 * Production uses Cloudinary when credentials are present (or IMAGE_STORAGE=cloudinary).
 */
export interface ProductImageStorage {
  save(files: IncomingImageFile[], tenantId: string): Promise<StoredProductImage[]>;
}

export function hasCloudinaryCredentials() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );
}

export function shouldUseCloudinary() {
  const explicit = (process.env.IMAGE_STORAGE || '').toLowerCase();
  if (explicit === 'local') return false;
  if (explicit === 'cloudinary') return true;
  return process.env.NODE_ENV === 'production' && hasCloudinaryCredentials();
}

export class LocalProductImageStorage implements ProductImageStorage {
  save(files: IncomingImageFile[], tenantId: string): Promise<StoredProductImage[]> {
    return Promise.resolve(
      files.map((file) => {
        const filename = file.filename || path.basename(file.path || '');
        if (!filename) throw new AppError(400, 'Upload did not produce a filename');
        return {
          url: `/uploads/${tenantId}/${filename}`,
          alt: file.originalname,
        };
      }),
    );
  }
}

export class CloudinaryProductImageStorage implements ProductImageStorage {
  async save(files: IncomingImageFile[], tenantId: string): Promise<StoredProductImage[]> {
    if (!hasCloudinaryCredentials()) {
      throw new AppError(
        503,
        'Cloudinary is required for product uploads in production. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.',
      );
    }
    const saved: StoredProductImage[] = [];
    for (const file of files) {
      saved.push(await uploadToCloudinary(file, tenantId));
    }
    return saved;
  }
}

function cloudinarySignature(params: Record<string, string>, apiSecret: string) {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  return crypto.createHash('sha1').update(`${toSign}${apiSecret}`).digest('hex');
}

async function uploadToCloudinary(file: IncomingImageFile, tenantId: string): Promise<StoredProductImage> {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME!;
  const apiKey = process.env.CLOUDINARY_API_KEY!;
  const apiSecret = process.env.CLOUDINARY_API_SECRET!;
  const buffer = file.buffer;
  if (!buffer?.length) {
    throw new AppError(400, 'Upload did not include image data for Cloudinary');
  }

  const timestamp = String(Math.floor(Date.now() / 1000));
  const folder = `essas-collection/products/${tenantId}`;
  const signed = { folder, timestamp };
  const signature = cloudinarySignature(signed, apiSecret);

  const form = new FormData();
  const blob = new Blob([new Uint8Array(buffer)], { type: file.mimetype || 'application/octet-stream' });
  form.append('file', blob, file.originalname || file.filename || 'product.jpg');
  form.append('api_key', apiKey);
  form.append('timestamp', timestamp);
  form.append('signature', signature);
  form.append('folder', folder);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
    method: 'POST',
    body: form,
  });
  const json = (await res.json().catch(() => ({}))) as { secure_url?: string; error?: { message?: string } };
  if (!res.ok || !json.secure_url) {
    throw new AppError(502, json.error?.message || 'Cloudinary rejected the image upload');
  }
  return { url: json.secure_url, alt: file.originalname };
}

export function createProductImageStorage(): ProductImageStorage {
  if (shouldUseCloudinary()) return new CloudinaryProductImageStorage();
  return new LocalProductImageStorage();
}

export const productImageStorage = createProductImageStorage();
