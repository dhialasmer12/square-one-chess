import nodemailer from 'nodemailer';

function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

export type EmailSendResult = { ok: true; mode: 'smtp' | 'log' };

function smtpUrl(): string | undefined {
  return env('SMTP_URL');
}

export function canSendSmtp(): boolean {
  if (smtpUrl() && env('MAIL_FROM')) {
    return true;
  }
  return !!(
    env('SMTP_HOST') &&
    env('SMTP_PORT') &&
    env('SMTP_USER') &&
    env('SMTP_PASS') &&
    env('MAIL_FROM')
  );
}

function appUrl(): string {
  return env('APP_URL') ?? 'http://localhost:3000';
}

function frontendUrl(): string {
  return env('FRONTEND_URL') ?? 'http://localhost:4200';
}

function transport() {
  const url = smtpUrl();
  if (url) {
    return nodemailer.createTransport(url);
  }
  return nodemailer.createTransport({
    host: env('SMTP_HOST'),
    port: Number(env('SMTP_PORT') ?? 587),
    secure: (env('SMTP_SECURE') ?? 'false').toLowerCase() === 'true',
    auth: {
      user: env('SMTP_USER'),
      pass: env('SMTP_PASS'),
    },
  });
}

function productName(): string {
  return env('APP_NAME') ?? 'Square One';
}

function baseHtml(args: { title: string; body: string }): string {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width,initial-scale=1"/>
    <title>${escapeHtml(args.title)}</title>
  </head>
  <body style="margin:0;background:#0b0b10;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial;color:#e4e4e7;">
    <div style="max-width:560px;margin:0 auto;padding:28px 18px;">
      <div style="background:#111827;border:1px solid rgba(244, 190, 61, 0.18);border-radius:16px;padding:22px;">
        <div style="font-size:14px;color:#a1a1aa;letter-spacing:.08em;text-transform:uppercase;">${escapeHtml(
          productName()
        )}</div>
        <h1 style="margin:10px 0 0;font-size:20px;color:#f4be3d;">${escapeHtml(
          args.title
        )}</h1>
        <div style="margin-top:14px;font-size:14px;line-height:1.55;color:#e4e4e7;">
          ${args.body}
        </div>
        <div style="margin-top:18px;font-size:12px;color:#71717a;">
          If you didn’t request this, you can safely ignore this email.
        </div>
      </div>
      <div style="margin-top:14px;font-size:12px;color:#52525b;text-align:center;">
        © ${new Date().getFullYear()} ${escapeHtml(productName())}
      </div>
    </div>
  </body>
</html>`;
}

function escapeHtml(s: string): string {
  // Use replace with global regex for ES2020 compatibility.
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function sendVerificationEmail(args: {
  to: string;
  username: string;
  token: string;
}): Promise<EmailSendResult> {
  const verifyLink = `${frontendUrl()}/verify-email?token=${encodeURIComponent(
    args.token
  )}`;
  const loginLink = `${frontendUrl()}/login`;

  const subject = `Verify your email for ${productName()}`;
  const html = baseHtml({
    title: 'Verify your email',
    body: `
      <p>Hi <b>${escapeHtml(args.username)}</b>,</p>
      <p>Thanks for signing up. Please verify your email address to activate your account.</p>
      <p style="margin:16px 0;">
        <a href="${verifyLink}"
           style="display:inline-block;background:#f59e0b;color:#09090b;text-decoration:none;padding:10px 14px;border-radius:10px;font-weight:700;">
          Verify email
        </a>
      </p>
      <p>If the button doesn’t work, copy and paste this link:</p>
      <p style="word-break:break-all;color:#fde68a;">${verifyLink}</p>
      <p style="margin-top:16px;">After verification you can sign in here: <a style="color:#c4b5fd;" href="${loginLink}">${loginLink}</a></p>
    `,
  });

  if (!canSendSmtp()) {
    console.log('[mail:log] verify link for', args.to, verifyLink);
    return { ok: true, mode: 'log' };
  }

  await transport().sendMail({
    from: env('MAIL_FROM'),
    to: args.to,
    subject,
    html,
  });
  return { ok: true, mode: 'smtp' };
}

export async function sendPasswordResetEmail(args: {
  to: string;
  username: string;
  token: string;
}): Promise<EmailSendResult> {
  const resetLink = `${frontendUrl()}/reset-password?token=${encodeURIComponent(
    args.token
  )}`;

  const subject = `Reset your ${productName()} password`;
  const html = baseHtml({
    title: 'Reset your password',
    body: `
      <p>Hi <b>${escapeHtml(args.username)}</b>,</p>
      <p>We received a request to reset your password.</p>
      <p style="margin:16px 0;">
        <a href="${resetLink}"
           style="display:inline-block;background:#f59e0b;color:#09090b;text-decoration:none;padding:10px 14px;border-radius:10px;font-weight:700;">
          Reset password
        </a>
      </p>
      <p>This link expires soon. If the button doesn’t work, copy and paste this link:</p>
      <p style="word-break:break-all;color:#fde68a;">${resetLink}</p>
    `,
  });

  if (!canSendSmtp()) {
    console.log('[mail:log] reset link for', args.to, resetLink);
    return { ok: true, mode: 'log' };
  }

  await transport().sendMail({
    from: env('MAIL_FROM'),
    to: args.to,
    subject,
    html,
  });
  return { ok: true, mode: 'smtp' };
}

