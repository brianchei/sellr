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

export async function sendVerificationSms(phoneE164: string): Promise<void> {
  const sid = process.env.TWILIO_VERIFY_SERVICE_SID;
  const serviceSid = !isPlaceholder(sid) ? sid : undefined;
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

export async function verifyOtpCode(
  phoneE164: string,
  code: string,
): Promise<boolean> {
  const sid = process.env.TWILIO_VERIFY_SERVICE_SID;
  const serviceSid = !isPlaceholder(sid) ? sid : undefined;
  if (twilioClient && serviceSid) {
    const check = await twilioClient.verify.v2
      .services(serviceSid)
      .verificationChecks.create({ to: phoneE164, code });
    return check.status === 'approved';
  }
  return code === '000000';
}
