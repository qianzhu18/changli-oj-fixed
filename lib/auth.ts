import { jwtVerify, SignJWT } from 'jose';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
export type UserRole = 'user' | 'developer' | 'root';

export async function signToken(payload: { userId: string; email: string; role?: UserRole }) {
  const secret = new TextEncoder().encode(JWT_SECRET);
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

export async function verifyToken(token: string) {
  const secret = new TextEncoder().encode(JWT_SECRET);
  const { payload } = await jwtVerify(token, secret);
  return payload as { userId: string; email: string; role?: UserRole; exp: number };
}

export async function getUserFromRequest(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth) return null;
  const token = auth.replace('Bearer ', '');
  try {
    const payload = await verifyToken(token);
    return { id: payload.userId, email: payload.email, role: payload.role || 'user' };
  } catch {
    return null;
  }
}

export async function requireUser(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }
  return user;
}

function parseEmails(value: string | undefined) {
  return (value || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function getUserRoleByEmail(email: string | null | undefined): UserRole {
  if (!email) return 'user';
  const normalized = email.trim().toLowerCase();
  const rootEmails = parseEmails(process.env.ROOT_EMAILS);
  if (rootEmails.includes(normalized)) return 'root';

  const developerEmails = parseEmails(process.env.DEVELOPER_EMAILS);
  if (developerEmails.includes(normalized)) return 'developer';

  // Keep compatibility with existing ADMIN_EMAILS configuration.
  const adminEmails = parseEmails(process.env.ADMIN_EMAILS);
  if (adminEmails.includes(normalized)) return 'developer';

  return 'user';
}

export function isAdminEmail(email: string | null) {
  const role = getUserRoleByEmail(email);
  return role === 'developer' || role === 'root';
}
