import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AppError } from './errors';

export const WORKERS_API_HEADER = 'x-df-api';
export const WORKERS_API_VALUE = 'workers';

function runtimeHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  headers.set(WORKERS_API_HEADER, WORKERS_API_VALUE);
  return headers;
}

export function json(data: unknown, status = 200, extra?: HeadersInit) {
  return NextResponse.json(data, { status, headers: runtimeHeaders(extra) });
}

export function apiError(err: unknown) {
  if (err instanceof AppError) {
    return json({ error: err.message, code: err.code }, err.statusCode);
  }
  if (err instanceof ZodError) {
    return json({ error: 'Validation failed', details: err.flatten() }, 400);
  }
  const prismaCode =
    err && typeof err === 'object' && 'code' in err ? String((err as { code?: string }).code) : '';
  if (prismaCode === 'P2002') {
    return json({ error: 'A record with this unique field already exists', code: prismaCode }, 409);
  }
  console.error(err);
  return json({ error: 'Internal server error' }, 500);
}

export async function readJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new AppError(400, 'Invalid JSON body');
  }
}
