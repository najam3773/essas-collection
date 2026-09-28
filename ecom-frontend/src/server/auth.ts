import { compare, hash } from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { AppError } from './errors';

export type AuthRealm = 'platform' | 'tenant' | 'customer';

export interface TokenPayload {
  sub: string;
  realm: AuthRealm;
  email: string;
  tenantId?: string;
  role?: string;
}

function secretFor(realm: AuthRealm) {
  const text =
    realm === 'platform'
      ? process.env.JWT_SECRET || 'dev-jwt-secret'
      : realm === 'tenant'
        ? process.env.JWT_STAFF_SECRET ||
          process.env.STAFF_JWT_SECRET ||
          process.env.JWT_TENANT_SECRET ||
          process.env.JWT_SECRET ||
          'dev-jwt-secret'
        : process.env.JWT_CUSTOMER_SECRET ||
          process.env.CUSTOMER_JWT_SECRET ||
          process.env.JWT_SECRET ||
          'dev-jwt-secret';
  return new TextEncoder().encode(text);
}

export async function hashPassword(password: string) {
  return hash(password, 10);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return compare(password, passwordHash);
}

export async function signToken(payload: TokenPayload, expiresIn = '7d') {
  const token = new SignJWT({
    realm: payload.realm,
    email: payload.email,
    tenantId: payload.tenantId,
    role: payload.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(expiresIn);
  return token.sign(secretFor(payload.realm));
}

export async function verifyToken(token: string, realm: AuthRealm): Promise<TokenPayload> {
  try {
    const { payload } = await jwtVerify(token, secretFor(realm));
    const parsed: TokenPayload = {
      sub: String(payload.sub || ''),
      realm: payload.realm as AuthRealm,
      email: String(payload.email || ''),
      tenantId: payload.tenantId ? String(payload.tenantId) : undefined,
      role: payload.role ? String(payload.role) : undefined,
    };
    if (!parsed.sub || parsed.realm !== realm) {
      throw new AppError(401, 'Invalid auth realm');
    }
    return parsed;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(401, 'Invalid or expired token');
  }
}
