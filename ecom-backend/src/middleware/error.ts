import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import multer from 'multer';
import { AppError } from '../lib/errors.js';
import { ZodError } from 'zod';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message, code: err.code });
  }
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Validation failed', details: err.flatten() });
  }
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Each image must be 5MB or smaller' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'You can upload at most 12 images at once' });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err instanceof Prisma.PrismaClientValidationError) {
    const detail = err.message.split('\n').filter((line) => line.trim()).pop() || err.message;
    return res.status(400).json({ error: detail, code: 'VALIDATION' });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const fields = Array.isArray(err.meta?.target) ? (err.meta?.target as string[]).join(', ') : 'unique field';
      return res.status(409).json({ error: `A record with this ${fields} already exists`, code: err.code });
    }
    if (err.code === 'P2003') {
      return res.status(409).json({
        error: 'This record is still referenced by related data (cart, orders, or wishlist) and cannot be removed that way.',
        code: err.code,
      });
    }
    if (err.code === 'P2022') {
      return res.status(500).json({
        error: `Database is missing a required column (${String(err.meta?.column || 'unknown')}). Apply the latest schema before retrying.`,
        code: err.code,
      });
    }
  }
  console.error(err);
  return res.status(500).json({ error: 'Internal server error' });
}
