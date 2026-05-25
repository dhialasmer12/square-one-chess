/**
 * Admin allowlist via env. If neither ADMIN_USER_IDS nor ADMIN_EMAILS is set,
 * non-production treats every authenticated user as admin (convenient for PFE).
 */
export function isAdminUser(userId: string, email: string): boolean {
  const ids =
    process.env.ADMIN_USER_IDS?.split(',')
      .map((s) => s.trim())
      .filter(Boolean) ?? [];
  if (ids.length > 0) {
    return ids.includes(userId);
  }
  const emails =
    process.env.ADMIN_EMAILS?.split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean) ?? [];
  if (emails.length > 0) {
    return emails.includes(email.toLowerCase());
  }
  return process.env.NODE_ENV !== 'production';
}
