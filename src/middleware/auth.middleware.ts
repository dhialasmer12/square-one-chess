import type { RequestHandler } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { HttpError } from '../types';

function readCookie(req: { headers: { cookie?: string } }, name: string): string | null {
  const raw = req.headers.cookie;
  if (!raw) return null;
  const parts = raw.split(';');
  for (const p of parts) {
    const [k, ...rest] = p.trim().split('=');
    if (k === name) {
      return decodeURIComponent(rest.join('='));
    }
  }
  return null;
}

/**
 * Verifies `Authorization: Bearer <JWT>`, decodes the payload, and sets `req.user`.
 */
export const verifyToken: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  const bearer =
    header && header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : '';
  const cookieToken = readCookie(req, 'square_one_access_token') ?? '';
  const token = bearer || cookieToken;
  if (!token) {
    next(new HttpError(401, 'Missing token'));
    return;
  }

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    next(new HttpError(401, 'Invalid or expired token'));
  }
};

/** @deprecated Use `verifyToken` — kept for clearer naming in route files. */
export const requireAuth = verifyToken;
