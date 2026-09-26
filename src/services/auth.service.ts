import { prisma } from '../models';
import { hashPassword, verifyPassword } from '../utils/password';
import { signAccessToken } from '../utils/jwt';
import { HttpError } from '../types';
import type { RegisterBody, LoginBody, AuthTokens, UpdateProfileBody } from '../types';
import { assertValidUsername, isValidEmail } from '../utils/validation';
import { generateOneTimeToken, sha256Hex } from '../utils/tokens';
import { sendPasswordResetEmail, sendVerificationEmail } from './email.service';
import { isEmailVerificationRequired, shouldAutoVerifyEmailInDev } from '../utils/auth-config';
import { isAdminUser } from '../utils/admin';

function resolveLoginIdentifier(body: LoginBody): string {
  return (body.identifier ?? body.email ?? body.username ?? '').trim();
}

export async function registerUser(
  body: RegisterBody
): Promise<{
  userId: string;
  emailVerificationRequired: boolean;
  tokens: AuthTokens;
}> {
  const email = (body.email ?? '').trim().toLowerCase();
  const password = body.password ?? '';
  const usernameRaw = (body.username ?? body.displayName ?? '').trim();

  if (!email || !password || !usernameRaw) {
    throw new HttpError(
      400,
      'email, password, and username (or displayName) are required'
    );
  }
  if (!isValidEmail(email)) {
    throw new HttpError(400, 'Invalid email format');
  }
  if (password.length < 6) {
    throw new HttpError(400, 'password must be at least 6 characters');
  }
  assertValidUsername(usernameRaw);

  const existingEmail = await prisma.user.findUnique({ where: { email } });
  if (existingEmail) {
    throw new HttpError(409, 'Email already registered');
  }
  const existingUsername = await prisma.user.findUnique({
    where: { username: usernameRaw },
  });
  if (existingUsername) {
    throw new HttpError(409, 'Username already taken');
  }

  const hashed = await hashPassword(password);
  const autoVerify = shouldAutoVerifyEmailInDev();
  const { token, tokenHash } = generateOneTimeToken();
  const verifyExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h

  const user = await prisma.user.create({
    data: {
      email,
      username: usernameRaw,
      password: hashed,
      emailVerified: autoVerify,
      emailVerifyTokenHash: autoVerify ? null : tokenHash,
      emailVerifyExpiresAt: autoVerify ? null : verifyExpiresAt,
    },
  });

  let verificationEmailSent = false;
  if (!autoVerify) {
    try {
      const sendResult = await sendVerificationEmail({
        to: user.email,
        username: user.username,
        token,
      });
      verificationEmailSent = sendResult.mode === 'smtp';
      if (isEmailVerificationRequired() && !verificationEmailSent) {
        // Dev: link is logged to server console — registration still succeeds.
        console.log(
          `[auth] Verification link for ${user.email} — open /verify-email?token=… (see [mail:log] above)`
        );
      }
    } catch (err) {
      await prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
      throw new HttpError(
        503,
        'Could not send verification email. Check SMTP settings or set REQUIRE_EMAIL_VERIFICATION=false for local dev.'
      );
    }
  }

  const accessToken = signAccessToken({ sub: user.id, email: user.email });
  return {
    userId: user.id,
    emailVerificationRequired:
      isEmailVerificationRequired() && !user.emailVerified,
    tokens: {
      accessToken,
      expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
    },
  };
}

export async function loginUser(
  body: LoginBody
): Promise<{ userId: string; tokens: AuthTokens }> {
  const identifier = resolveLoginIdentifier(body);
  const password = body.password ?? '';

  if (!identifier || !password) {
    throw new HttpError(
      400,
      'identifier (email or username), or email/username fields, and password are required'
    );
  }
  if (password.length < 6) {
    throw new HttpError(400, 'password must be at least 6 characters');
  }

  let user;
  if (identifier.includes('@')) {
    const email = identifier.toLowerCase();
    if (!isValidEmail(email)) {
      throw new HttpError(400, 'Invalid email format');
    }
    user = await prisma.user.findUnique({ where: { email } });
  } else {
    assertValidUsername(identifier);
    user = await prisma.user.findUnique({ where: { username: identifier } });
  }

  if (!user) {
    throw new HttpError(401, 'Invalid credentials');
  }
  if (user.email === 'open-seat@system.local') {
    throw new HttpError(401, 'Invalid credentials');
  }

  const ok = await verifyPassword(password, user.password);
  if (!ok) {
    throw new HttpError(401, 'Invalid credentials');
  }

  if (isEmailVerificationRequired() && !user.emailVerified) {
    throw new HttpError(403, 'Email not verified');
  }

  const accessToken = signAccessToken({ sub: user.id, email: user.email });
  return {
    userId: user.id,
    tokens: {
      accessToken,
      expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
    },
  };
}

export async function getUserProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      username: true,
      elo: true,
      eloBullet: true,
      eloBlitz: true,
      eloRapid: true,
      gamesPlayed: true,
      gamesWon: true,
      createdAt: true,
      updatedAt: true,
      emailVerified: true,
    },
  });
  if (!user) {
    throw new HttpError(404, 'User not found');
  }
  if (isEmailVerificationRequired() && !user.emailVerified) {
    throw new HttpError(403, 'Email not verified');
  }
  return {
    ...user,
    displayName: user.username,
    isAdmin: isAdminUser(user.id, user.email),
  };
}

const ELO_MIN = 0;
const ELO_MAX = 4000;

export async function updateUserElo(userId: string, newElo: number) {
  if (typeof newElo !== 'number' || !Number.isFinite(newElo)) {
    throw new HttpError(400, 'newElo must be a finite number');
  }
  const elo = Math.round(newElo);
  if (elo < ELO_MIN || elo > ELO_MAX) {
    throw new HttpError(
      400,
      `newElo must be an integer between ${ELO_MIN} and ${ELO_MAX}`
    );
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        elo,
        eloBullet: elo,
        eloBlitz: elo,
        eloRapid: elo,
      },
    });
  } catch {
    throw new HttpError(404, 'User not found');
  }

  return getUserProfile(userId);
}

export async function updateUserProfile(
  userId: string,
  body: UpdateProfileBody
) {
  const hasUsername =
    body.username !== undefined && String(body.username).trim() !== '';
  const hasPassword =
    body.newPassword !== undefined && String(body.newPassword) !== '';

  if (!hasUsername && !hasPassword) {
    throw new HttpError(400, 'Nothing to update');
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new HttpError(404, 'User not found');
  }

  if (hasPassword) {
    const cur = body.currentPassword ?? '';
    if (!cur) {
      throw new HttpError(400, 'currentPassword is required to set newPassword');
    }
    const ok = await verifyPassword(cur, user.password);
    if (!ok) {
      throw new HttpError(401, 'Current password is incorrect');
    }
    const next = String(body.newPassword);
    if (next.length < 6) {
      throw new HttpError(400, 'newPassword must be at least 6 characters');
    }
    await prisma.user.update({
      where: { id: userId },
      data: { password: await hashPassword(next) },
    });
  }

  if (hasUsername) {
    const usernameRaw = String(body.username).trim();
    assertValidUsername(usernameRaw);
    const taken = await prisma.user.findFirst({
      where: { username: usernameRaw, NOT: { id: userId } },
    });
    if (taken) {
      throw new HttpError(409, 'Username already taken');
    }
    await prisma.user.update({
      where: { id: userId },
      data: { username: usernameRaw },
    });
  }

  return getUserProfile(userId);
}

export async function requestEmailVerification(
  userId: string
): Promise<{ ok: true; delivered: boolean }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new HttpError(404, 'User not found');
  }
  if (user.emailVerified) {
    return { ok: true, delivered: false };
  }
  const { token, tokenHash } = generateOneTimeToken();
  const verifyExpiresAt = new Date(Date.now() + 1000 * 60 * 30); // 30 min
  await prisma.user.update({
    where: { id: userId },
    data: {
      emailVerifyTokenHash: tokenHash,
      emailVerifyExpiresAt: verifyExpiresAt,
    },
  });
  const sendResult = await sendVerificationEmail({
    to: user.email,
    username: user.username,
    token,
  });
  if (isEmailVerificationRequired() && sendResult.mode !== 'smtp') {
    console.log(
      `[auth] Resent verification for ${user.email} — see [mail:log] in server console`
    );
  }
  return { ok: true, delivered: sendResult.mode === 'smtp' };
}

/** Public resend when the user is not logged in (e.g. after failed login). */
export async function resendVerificationByEmail(
  emailRaw: string
): Promise<{ ok: true; delivered: boolean }> {
  const email = emailRaw.trim().toLowerCase();
  if (!email || !isValidEmail(email)) {
    throw new HttpError(400, 'Valid email is required');
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // Do not reveal whether the email exists.
    return { ok: true, delivered: false };
  }
  if (user.emailVerified) {
    return { ok: true, delivered: false };
  }
  const { token, tokenHash } = generateOneTimeToken();
  const verifyExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerifyTokenHash: tokenHash,
      emailVerifyExpiresAt: verifyExpiresAt,
    },
  });
  const sendResult = await sendVerificationEmail({
    to: user.email,
    username: user.username,
    token,
  });
  if (sendResult.mode !== 'smtp') {
    console.log(`[auth] Verification link for ${user.email} — see [mail:log] above`);
  }
  return { ok: true, delivered: sendResult.mode === 'smtp' };
}

export async function verifyEmailByToken(token: string): Promise<void> {
  const raw = token.trim();
  if (!raw) {
    throw new HttpError(400, 'token is required');
  }
  const tokenHash = sha256Hex(raw);
  const user = await prisma.user.findFirst({
    where: { emailVerifyTokenHash: tokenHash },
  });
  if (!user || !user.emailVerifyExpiresAt) {
    throw new HttpError(400, 'Invalid or expired verification token');
  }
  if (user.emailVerifyExpiresAt.getTime() < Date.now()) {
    throw new HttpError(400, 'Invalid or expired verification token');
  }
  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      emailVerifyTokenHash: null,
      emailVerifyExpiresAt: null,
    },
  });
}

export async function requestPasswordReset(emailRaw: string): Promise<{ ok: true }> {
  const email = emailRaw.trim().toLowerCase();
  if (!email || !isValidEmail(email)) {
    // Don’t reveal user existence.
    return { ok: true };
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return { ok: true };
  }
  const { token, tokenHash } = generateOneTimeToken();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 20); // 20 min
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: expiresAt,
    },
  });
  await sendPasswordResetEmail({ to: user.email, username: user.username, token });
  return { ok: true };
}

export async function resetPasswordWithToken(args: {
  token: string;
  newPassword: string;
}): Promise<void> {
  const token = (args.token ?? '').trim();
  const newPassword = args.newPassword ?? '';
  if (!token) {
    throw new HttpError(400, 'token is required');
  }
  if (newPassword.length < 6) {
    throw new HttpError(400, 'newPassword must be at least 6 characters');
  }
  const tokenHash = sha256Hex(token);
  const user = await prisma.user.findFirst({
    where: { passwordResetTokenHash: tokenHash },
  });
  if (!user || !user.passwordResetExpiresAt) {
    throw new HttpError(400, 'Invalid or expired reset token');
  }
  if (user.passwordResetExpiresAt.getTime() < Date.now()) {
    throw new HttpError(400, 'Invalid or expired reset token');
  }
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: await hashPassword(newPassword),
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null,
    },
  });
}
