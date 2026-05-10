import { createHash } from 'node:crypto';
import * as Sentry from '@sentry/node';

export function phoneLogContext(phoneE164: string): {
  phoneHash: string;
  phoneLast4: string;
} {
  return {
    phoneHash: createHash('sha256')
      .update(phoneE164)
      .digest('hex')
      .slice(0, 12),
    phoneLast4: phoneE164.slice(-4),
  };
}

export function emailLogContext(email: string): {
  emailHash: string;
  emailDomain: string | null;
} {
  const normalized = email.trim().toLowerCase();
  return {
    emailHash: createHash('sha256')
      .update(normalized)
      .digest('hex')
      .slice(0, 12),
    emailDomain: normalized.split('@')[1] ?? null,
  };
}

export function captureOperationalError(
  error: unknown,
  {
    component,
    operation,
    tags,
    extra,
    userId,
  }: {
    component: string;
    operation: string;
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
    userId?: string;
  },
): void {
  Sentry.captureException(error, {
    tags: {
      component,
      operation,
      ...tags,
    },
    extra,
    user: userId ? { id: userId } : undefined,
  });
}
