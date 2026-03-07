import jwt from 'jsonwebtoken';
import { getUserModel } from '@/models/User';

export const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
export const TOKEN_COOKIE = 'foodai_auth_token';

export function signToken(payload, options = {}) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '7d',
    ...options,
  });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export async function getUserFromToken(token) {
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded || !decoded.sub) return null;

  const User = await getUserModel();
  const user = await User.findById(decoded.sub).select('-passwordHash').lean();
  return user || null;
}

