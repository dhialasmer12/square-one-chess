/**
 * Admin allowlist. A user is admin only if their id or email is listed.
 * Default demo account: admin@squareone.local (see prisma/seed.ts).
 * Override with ADMIN_USER_IDS and/or ADMIN_EMAILS (comma-separated).
 */
export function isAdminUser(userId: string, email: string): boolean {
  const ids =
    process.env.ADMIN_USER_IDS?.split(',')
      .map((s) => s.trim())
      .filter(Boolean) ?? [];
  if (ids.includes(userId)) {
    return true;
  }

  const fromEnv =
    process.env.ADMIN_EMAILS?.split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean) ?? [];
  const emails = fromEnv.length > 0 ? fromEnv : ['admin@squareone.local'];
  return emails.includes(email.toLowerCase());
}
