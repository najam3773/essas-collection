import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export type AuthRealm = 'platform' | 'tenant' | 'customer';

export interface TokenPayload {
  sub: string;
  realm: AuthRealm;
  email: string;
  tenantId?: string;
  role?: string;
}

const secrets: Record<AuthRealm, string> = {
  platform: config.jwt.platform,
  tenant: config.jwt.tenant,
  customer: config.jwt.customer,
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: TokenPayload, expiresIn: string | number = '7d') {
  return jwt.sign(payload, secrets[payload.realm], { expiresIn } as jwt.SignOptions);
}

export function verifyToken(token: string, realm: AuthRealm): TokenPayload {
  return jwt.verify(token, secrets[realm]) as TokenPayload;
}
