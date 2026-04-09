import twilio from 'twilio';
import { redis } from './redis';

const twilioClient =
  process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
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
  if (twilioClient && sid) {
    await twilioClient.verify.v2.services(sid).verifications.create({
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
  if (twilioClient && sid) {
    const check = await twilioClient.verify.v2
      .services(sid)
      .verificationChecks.create({ to: phoneE164, code });
    return check.status === 'approved';
  }
  return code === '000000';
}
