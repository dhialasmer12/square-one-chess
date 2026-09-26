import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as authService from '../services/auth.service';
import type { RegisterBody, LoginBody, UpdateEloBody, UpdateProfileBody } from '../types';
import { HttpError } from '../types';

function cookieSecure(): boolean {
  return (process.env.COOKIE_SECURE ?? (process.env.NODE_ENV === 'production' ? 'true' : 'false')).toLowerCase() === 'true';
}

function cookieMaxAgeMs(): number {
  // Default 7 days (matches JWT_EXPIRES_IN default).
  const days = Number(process.env.COOKIE_MAX_AGE_DAYS ?? 7);
  const d = Number.isFinite(days) ? Math.min(30, Math.max(1, Math.floor(days))) : 7;
  return d * 24 * 60 * 60 * 1000;
}

function setAuthCookie(res: Response, token: string): void {
  res.cookie('square_one_access_token', token, {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: 'lax',
    maxAge: cookieMaxAgeMs(),
    path: '/',
  });
}

function clearAuthCookie(res: Response): void {
  res.cookie('square_one_access_token', '', {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
}

export const register = asyncHandler(async (req, res: Response) => {
  const body = req.body as RegisterBody;
  const result = await authService.registerUser(body);
  // Do not open a session until email is verified (when verification is required).
  if (result.emailVerificationRequired) {
    clearAuthCookie(res);
  } else {
    setAuthCookie(res, result.tokens.accessToken);
  }
  // Token is only in the HttpOnly cookie — not in JSON (avoids localStorage / XSS token theft).
  res.status(201).json({
    userId: result.userId,
    expiresIn: result.tokens.expiresIn,
    emailVerificationRequired: result.emailVerificationRequired,
  });
});

export const login = asyncHandler(async (req, res: Response) => {
  const body = req.body as LoginBody;
  const result = await authService.loginUser(body);
  setAuthCookie(res, result.tokens.accessToken);
  res.json({
    userId: result.userId,
    expiresIn: result.tokens.expiresIn,
  });
});

export const getMe = asyncHandler(async (req, res: Response) => {
  const userId = req.user!.sub;
  const profile = await authService.getUserProfile(userId);
  res.json(profile);
});

export const updateProfile = asyncHandler(async (req, res: Response) => {
  const userId = req.user!.sub;
  const body = (req.body ?? {}) as UpdateProfileBody;
  const profile = await authService.updateUserProfile(userId, body);
  res.json(profile);
});

export const updateElo = asyncHandler(async (req, res: Response) => {
  const userId = req.user!.sub;
  const body = req.body as UpdateEloBody;
  const raw = body?.newElo;
  if (raw === undefined || raw === null) {
    throw new HttpError(400, 'newElo is required');
  }
  const newElo = Number(raw);
  const profile = await authService.updateUserElo(userId, newElo);
  res.json(profile);
});

export const requestEmailVerification = asyncHandler(async (req, res: Response) => {
  const userId = req.user!.sub;
  const result = await authService.requestEmailVerification(userId);
  res.json(result);
});

export const resendVerification = asyncHandler(async (req, res: Response) => {
  const email = typeof req.body?.email === 'string' ? req.body.email : '';
  const result = await authService.resendVerificationByEmail(email);
  res.json(result);
});

export const verifyEmail = asyncHandler(async (req, res: Response) => {
  const token = typeof req.query.token === 'string' ? req.query.token : '';
  await authService.verifyEmailByToken(token);
  const wantsJson =
    req.query.format === 'json' ||
    req.get('accept')?.includes('application/json');
  if (wantsJson) {
    res.json({ ok: true, message: 'Email verified' });
    return;
  }
  res
    .status(200)
    .type('html')
    .send(
      `<!doctype html><html><head><meta charset=\"utf-8\"/><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"/><title>Email verified</title></head><body style=\"font-family:system-ui,Segoe UI,Roboto,Arial;background:#0b0b10;color:#e4e4e7;padding:32px;\"><div style=\"max-width:560px;margin:0 auto;border:1px solid rgba(244,190,61,0.2);background:#111827;border-radius:16px;padding:18px;\"><h1 style=\"margin:0;color:#f4be3d;font-size:20px;\">Email verified</h1><p style=\"margin:10px 0 0;color:#a1a1aa;\">Your account is now active. You can close this page and sign in.</p></div></body></html>`
    );
});

export const forgotPassword = asyncHandler(async (req, res: Response) => {
  const email = typeof req.body?.email === 'string' ? req.body.email : '';
  const result = await authService.requestPasswordReset(email);
  res.json(result);
});

export const resetPasswordForm = asyncHandler(async (req, res: Response) => {
  const token = typeof req.query.token === 'string' ? req.query.token : '';
  if (!token) {
    throw new HttpError(400, 'token is required');
  }
  res
    .status(200)
    .type('html')
    .send(
      `<!doctype html><html><head><meta charset=\"utf-8\"/><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"/><title>Reset password</title></head><body style=\"font-family:system-ui,Segoe UI,Roboto,Arial;background:#0b0b10;color:#e4e4e7;padding:32px;\"><div style=\"max-width:560px;margin:0 auto;border:1px solid rgba(244,190,61,0.2);background:#111827;border-radius:16px;padding:18px;\"><h1 style=\"margin:0;color:#f4be3d;font-size:20px;\">Reset password</h1><p style=\"margin:10px 0 14px;color:#a1a1aa;\">Choose a new password (min 6 chars).</p><form method=\"POST\" action=\"/api/auth/reset-password\" style=\"display:flex;flex-direction:column;gap:10px;\"><input type=\"hidden\" name=\"token\" value=\"${encodeURIComponent(
        token
      )}\"/><input name=\"newPassword\" type=\"password\" required minlength=\"6\" placeholder=\"New password\" style=\"padding:10px 12px;border-radius:10px;border:1px solid #27272a;background:#0b0b10;color:#e4e4e7;\"/><button type=\"submit\" style=\"padding:10px 12px;border-radius:10px;border:0;background:#f59e0b;color:#09090b;font-weight:700;cursor:pointer;\">Reset</button></form></div></body></html>`
    );
});

export const resetPassword = asyncHandler(async (req, res: Response) => {
  // Accept JSON or HTML form posts.
  const token =
    typeof req.body?.token === 'string'
      ? req.body.token
      : typeof req.query.token === 'string'
        ? req.query.token
        : '';
  const newPassword =
    typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
  await authService.resetPasswordWithToken({ token, newPassword });
  res
    .status(200)
    .type('html')
    .send(
      `<!doctype html><html><head><meta charset=\"utf-8\"/><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"/><title>Password updated</title></head><body style=\"font-family:system-ui,Segoe UI,Roboto,Arial;background:#0b0b10;color:#e4e4e7;padding:32px;\"><div style=\"max-width:560px;margin:0 auto;border:1px solid rgba(34,197,94,0.2);background:#111827;border-radius:16px;padding:18px;\"><h1 style=\"margin:0;color:#22c55e;font-size:20px;\">Password updated</h1><p style=\"margin:10px 0 0;color:#a1a1aa;\">You can now sign in with your new password.</p></div></body></html>`
    );
});

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});
