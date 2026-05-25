import jwt, { type SignOptions } from 'jsonwebtoken';
import type { JwtPayload } from '../types';
import { HttpError } from '../types';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (secret && secret.length >= 16) {
    return secret;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new HttpError(
      500,
      'Server misconfiguration: JWT_SECRET must be set (minimum 16 characters)'
    );
  }
  if (secret && secret.length > 0) {
    return secret;
  }
  return 'development-jwt-secret-min16';
}

const JWT_EXPIRES: SignOptions['expiresIn'] = (
  process.env.JWT_EXPIRES_IN ?? '7d'
) as SignOptions['expiresIn'];

export function signAccessToken(payload: JwtPayload): string {
  const secret = getJwtSecret();
  const options: SignOptions = { expiresIn: JWT_EXPIRES };
  return jwt.sign({ sub: payload.sub, email: payload.email }, secret, options);
}

export function verifyAccessToken(token: string): JwtPayload {
  const secret = getJwtSecret();
  const decoded = jwt.verify(token, secret);
  if (
    typeof decoded !== 'object' ||
    decoded === null ||
    !('sub' in decoded) ||
    !('email' in decoded)
  ) {
    throw new Error('Invalid token payload');
  }
  return { sub: String(decoded.sub), email: String(decoded.email) };
}
