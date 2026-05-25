import { canSendSmtp } from '../services/email.service';

/** When false, users can log in without verifying email. */
export function isEmailVerificationRequired(): boolean {
  return (
    (process.env.REQUIRE_EMAIL_VERIFICATION ?? 'true').toLowerCase() !== 'false'
  );
}

/**
 * In local dev without SMTP, auto-verify so register/login work out of the box.
 * Set DEV_AUTO_VERIFY_EMAIL=false to test the full verification flow with console links.
 */
export function shouldAutoVerifyEmailInDev(): boolean {
  if (!isEmailVerificationRequired()) {
    return true;
  }
  const explicit = process.env.DEV_AUTO_VERIFY_EMAIL?.trim().toLowerCase();
  if (explicit === 'true') return true;
  if (explicit === 'false') return false;
  // Default in non-production: auto-verify when mail cannot be delivered.
  if (process.env.NODE_ENV === 'production') {
    return false;
  }
  return !canSendSmtp();
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}
