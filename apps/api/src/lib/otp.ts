import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import twilio from 'twilio';
import { redis } from './redis';

function isPlaceholder(value: string | undefined): boolean {
  if (!value) return true;
  const v = value.trim();
  if (!v) return true;
  // Common local `.env` placeholders in this repo / guides.
  return (
    v.includes('xxxx') ||
    v.includes('...') ||
    v.startsWith('change_me') ||
    v.includes('[PROJECT_REF]') ||
    v.includes('[PASSWORD]')
  );
}

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioClient =
  !isPlaceholder(accountSid) && !isPlaceholder(authToken)
    ? twilio(accountSid, authToken)
    : null;

function twilioVerifyServiceSid(): string | undefined {
  const sid = process.env.TWILIO_VERIFY_SERVICE_SID;
  return !isPlaceholder(sid) ? sid : undefined;
}

function hasTwilioVerifyConfig(): boolean {
  return Boolean(twilioClient && twilioVerifyServiceSid());
}

export function isLocalOtpMode(): boolean {
  return !hasTwilioVerifyConfig() && process.env.NODE_ENV !== 'production';
}

function resendApiKey(): string | undefined {
  const apiKey = process.env.RESEND_API_KEY;
  return !isPlaceholder(apiKey) ? apiKey : undefined;
}

function emailFrom(): string | undefined {
  const from = process.env.EMAIL_FROM;
  return !isPlaceholder(from) ? from : undefined;
}

export function hasResendEmailConfig(): boolean {
  return Boolean(resendApiKey() && emailFrom());
}

export function isLocalEmailOtpMode(): boolean {
  return !hasResendEmailConfig() && process.env.NODE_ENV !== 'production';
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isAllowedEmailOtpDomain(email: string): boolean {
  const domain = normalizeEmail(email).split('@')[1];
  if (!domain) {
    return false;
  }

  const allowedDomains = (process.env.EMAIL_OTP_ALLOWED_DOMAINS ?? 'wisc.edu')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  return allowedDomains.includes(domain);
}

export function emailOtpTtlSeconds(): number {
  const parsed = Number.parseInt(process.env.EMAIL_OTP_TTL_SECONDS ?? '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 600;
  }
  return Math.min(parsed, 3600);
}

function emailOtpCodeKey(email: string): string {
  return `otp:email:code:${normalizeEmail(email)}`;
}

function emailOtpAttemptKey(email: string): string {
  return `otp:email:attempt:${normalizeEmail(email)}`;
}

function emailOtpSecret(): string {
  return (
    process.env.EMAIL_OTP_SECRET ??
    process.env.JWT_SECRET ??
    'dev-email-otp-secret-change-me'
  );
}

function hashEmailOtp(email: string, code: string): string {
  return createHmac('sha256', emailOtpSecret())
    .update(`${normalizeEmail(email)}:${code}`)
    .digest('hex');
}

function safeEqualHex(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, 'hex');
  const rightBuffer = Buffer.from(right, 'hex');
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function generateEmailOtpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

export async function incrementOtpSendCount(
  phoneE164: string,
): Promise<number> {
  const key = `otp:send:${phoneE164}`;
  const n = await redis.incr(key);
  if (n === 1) {
    await redis.expire(key, 3600);
  }
  return n;
}

export async function incrementEmailOtpSendCount(
  email: string,
): Promise<number> {
  const key = `otp:email:send:${normalizeEmail(email)}`;
  const n = await redis.incr(key);
  if (n === 1) {
    await redis.expire(key, 3600);
  }
  return n;
}

export async function sendVerificationSms(phoneE164: string): Promise<void> {
  const serviceSid = twilioVerifyServiceSid();
  if (twilioClient && serviceSid) {
    await twilioClient.verify.v2.services(serviceSid).verifications.create({
      to: phoneE164,
      channel: 'sms',
    });
    return;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Twilio Verify is not configured');
  }
}

async function storeEmailOtp(email: string, code: string): Promise<void> {
  await redis.setex(
    emailOtpCodeKey(email),
    emailOtpTtlSeconds(),
    hashEmailOtp(email, code),
  );
  await redis.del(emailOtpAttemptKey(email));
}

async function sendResendEmail(email: string, code: string): Promise<void> {
  const apiKey = resendApiKey();
  const from = emailFrom();
  if (!apiKey || !from) {
    throw new Error('Resend email OTP is not configured');
  }

  const ttlMinutes = Math.max(1, Math.ceil(emailOtpTtlSeconds() / 60));
  const ttlMinutesText = String(ttlMinutes);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [normalizeEmail(email)],
      subject: 'Your Sellr verification code',
      text: `Your Sellr verification code is ${code}. It expires in ${ttlMinutesText} minutes.`,
      html: `<p>Your Sellr verification code is <strong>${code}</strong>.</p><p>It expires in ${ttlMinutesText} minutes.</p>`,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `Resend email OTP send failed (${String(response.status)}): ${detail}`,
    );
  }
}

export async function sendVerificationEmail(email: string): Promise<void> {
  if (!hasResendEmailConfig() && process.env.NODE_ENV === 'production') {
    throw new Error('Resend email OTP is not configured');
  }

  const code = isLocalEmailOtpMode() ? '000000' : generateEmailOtpCode();
  await storeEmailOtp(email, code);

  if (hasResendEmailConfig()) {
    await sendResendEmail(email, code);
  }
}

export async function verifyOtpCode(
  phoneE164: string,
  code: string,
): Promise<boolean> {
  const serviceSid = twilioVerifyServiceSid();
  if (twilioClient && serviceSid) {
    const check = await twilioClient.verify.v2
      .services(serviceSid)
      .verificationChecks.create({ to: phoneE164, code });
    return check.status === 'approved';
  }
  return code === '000000';
}

export type EmailOtpVerifyResult = 'valid' | 'invalid' | 'too_many_attempts';

export async function verifyEmailOtpCode(
  email: string,
  code: string,
): Promise<EmailOtpVerifyResult> {
  const attemptKey = emailOtpAttemptKey(email);
  const attempts = await redis.incr(attemptKey);
  if (attempts === 1) {
    await redis.expire(attemptKey, emailOtpTtlSeconds());
  }
  if (attempts > 5) {
    return 'too_many_attempts';
  }

  const expected = await redis.get(emailOtpCodeKey(email));
  const valid = expected
    ? safeEqualHex(expected, hashEmailOtp(email, code))
    : isLocalEmailOtpMode() && code === '000000';

  if (!valid) {
    return 'invalid';
  }

  await redis.del(emailOtpCodeKey(email));
  await redis.del(attemptKey);
  return 'valid';
}
