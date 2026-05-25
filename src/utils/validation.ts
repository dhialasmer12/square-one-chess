import { HttpError } from '../types';

/** Practical email check (not full RFC 5322). */
const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/** Letters and digits only (no spaces or symbols). */
const USERNAME_ALPHANUMERIC = /^[a-zA-Z0-9]+$/;

export const USERNAME_MIN = 2;
export const USERNAME_MAX = 32;

export function isValidEmail(email: string): boolean {
  if (!email || email.length > 254) return false;
  return EMAIL_REGEX.test(email);
}

export function assertValidUsername(username: string): void {
  if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) {
    throw new HttpError(
      400,
      `username must be between ${USERNAME_MIN} and ${USERNAME_MAX} characters`
    );
  }
  if (!USERNAME_ALPHANUMERIC.test(username)) {
    throw new HttpError(
      400,
      'username must contain only letters and numbers (alphanumeric)'
    );
  }
}
