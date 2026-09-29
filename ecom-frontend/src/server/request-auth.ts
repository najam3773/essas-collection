import { AppError } from './errors';
import { verifyToken, type TokenPayload } from './auth';

export function cartSessionHeader(req: Request): string | undefined {
  return req.headers.get('x-cart-session') || undefined;
}

export function bearerToken(req: Request): string | undefined {
  const header = req.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return undefined;
  return header.slice(7);
}

export async function optionalCustomer(req: Request): Promise<TokenPayload | undefined> {
  const token = bearerToken(req);
  if (!token) return undefined;
  try {
    return await verifyToken(token, 'customer');
  } catch {
    return undefined;
  }
}

export async function requireCustomer(req: Request): Promise<TokenPayload> {
  const token = bearerToken(req);
  if (!token) throw new AppError(401, 'Missing authorization token');
  return verifyToken(token, 'customer');
}
