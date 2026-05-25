import crypto from 'crypto';

export type OneTimeToken = {
  token: string;
  tokenHash: string;
};

export function generateOneTimeToken(bytes = 32): OneTimeToken {
  const token = crypto.randomBytes(bytes).toString('base64url');
  const tokenHash = sha256Hex(token);
  return { token, tokenHash };
}

export function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}

