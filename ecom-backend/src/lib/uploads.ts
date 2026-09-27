import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import multer from 'multer';
import { config } from '../config.js';
import { AppError } from './errors.js';
import { shouldUseCloudinary } from './product-image-storage.js';

export const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

export const IMAGE_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
};

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_FILES = 12;

export function ensureUploadsDir() {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export function publicApiOrigin(req: { protocol: string; get: (name: string) => string | undefined }) {
  if (config.publicApiUrl) return config.publicApiUrl;
  if (config.webUrl) return config.webUrl.replace(/\/+$/, '');
  const proto = (req.get('x-forwarded-proto') || req.protocol || 'http').split(',')[0].trim();
  const host = (req.get('x-forwarded-host') || req.get('host') || `localhost:${config.port}`).split(',')[0].trim();
  return `${proto}://${host}`;
}

const diskStorage = multer.diskStorage({
  destination(req, _file, cb) {
    const tenantId = req.tenantId;
    if (!tenantId) {
      cb(new AppError(401, 'Tenant auth required'), '');
      return;
    }
    const dir = path.join(UPLOADS_DIR, tenantId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(_req, file, cb) {
    const ext = IMAGE_MIME[file.mimetype] || '.jpg';
    cb(null, `${randomUUID()}${ext}`);
  },
});

export const imageUpload = multer({
  storage: shouldUseCloudinary() ? multer.memoryStorage() : diskStorage,
  fileFilter(_req, file, cb) {
    if (!IMAGE_MIME[file.mimetype]) {
      cb(new AppError(400, 'Only JPEG, PNG, WebP, GIF, and AVIF images are allowed'));
      return;
    }
    cb(null, true);
  },
  limits: { fileSize: MAX_FILE_BYTES, files: MAX_FILES },
});
