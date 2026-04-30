'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { sendOtp, setAccessToken, verifyOtp } from '@sellr/api-client';
import { useAuth } from '@/components/auth-provider';

export default function LoginPage() {
  const router = useRouter();
  const {
    communityIds,
    hydrated,
    isAuthenticated,
    refreshSession,
    setSession,
  } = useAuth();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneE164, setPhoneE164] = useState('+1');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hydrated && isAuthenticated && communityIds !== null) {
      router.replace(communityIds.length > 0 ? '/dashboard' : '/onboarding');
    }
  }, [communityIds, hydrated, isAuthenticated, router]);

  const onSendOtp = async () => {
    setError(null);
    setLoading(true);
    try {
      await sendOtp(phoneE164.trim());
      setStep('otp');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  const onVerify = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await verifyOtp({
        phoneE164: phoneE164.trim(),
        code: code.trim(),
      });
      if ('accessToken' in res) {
        setAccessToken(res.accessToken);
      } else {
        setAccessToken(null);
      }
      setSession(res.userId);
      const session = await refreshSession();
      router.replace(
        session && session.communityIds.length > 0
          ? '/dashboard'
          : '/onboarding',
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  if (!hydrated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--bg-secondary)] px-6 py-16">
        <p className="text-center text-sm text-[var(--text-tertiary)]">Loading...</p>
      </main>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--bg-secondary)] px-6 py-16">
      <section className="w-full max-w-md rounded-lg border border-[var(--border-default)] bg-white p-6 shadow-sm sm:p-7">
        <Link href="/" className="mb-8 flex items-center gap-2 no-underline">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-brand-primary)] shadow-sm">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M3 9.5L12 4L21 9.5V20C21 20.55 20.55 21 20 21H4C3.45 21 3 20.55 3 20V9.5Z"
                stroke="white"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.25"
              />
              <path
                d="M9 21V13H15V21"
                stroke="white"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.25"
              />
            </svg>
          </span>
          <span className="text-lg font-bold text-[var(--text-primary)]">
            Sellr
          </span>
        </Link>

        <p className="text-sm font-medium text-[var(--color-brand-contrast)]">
          Phone sign-in
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">
          Sign in
        </h1>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
          Enter your phone in E.164 format, like +15551234567. In development
          without Twilio, use code{' '}
          <span className="font-mono text-[var(--text-primary)]">000000</span>.
        </p>

        {step === 'phone' ? (
          <>
            <label className="mt-8 block text-sm font-medium text-[var(--text-primary)]">
              Phone
              <input
                value={phoneE164}
                onChange={(e) => setPhoneE164(e.target.value)}
                type="tel"
                autoComplete="tel"
                placeholder="+15551234567"
                className="mt-2 w-full rounded-lg border border-[var(--border-default)] bg-white px-3 py-2.5 text-[var(--text-primary)] outline-none focus:border-[var(--color-brand-contrast)] focus:ring-2 focus:ring-[var(--color-brand-contrast-muted)]"
              />
            </label>
            <button
              type="button"
              onClick={() => void onSendOtp()}
              disabled={loading || phoneE164.trim().length < 8}
              className="mt-4 w-full rounded-lg bg-[var(--color-brand-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] shadow-sm hover:bg-[var(--color-brand-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send code'}
            </button>
          </>
        ) : (
          <>
            <p className="mt-8 text-sm text-[var(--text-secondary)]">
              Code sent to{' '}
              <span className="font-medium text-[var(--text-primary)]">{phoneE164}</span>
            </p>
            <label className="mt-4 block text-sm font-medium text-[var(--text-primary)]">
              Verification code
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                className="mt-2 w-full rounded-lg border border-[var(--border-default)] bg-white px-3 py-2.5 text-center font-mono text-lg text-[var(--text-primary)] outline-none focus:border-[var(--color-brand-contrast)] focus:ring-2 focus:ring-[var(--color-brand-contrast-muted)]"
              />
            </label>
            <button
              type="button"
              onClick={() => void onVerify()}
              disabled={loading || code.length !== 6}
              className="mt-4 w-full rounded-lg bg-[var(--color-brand-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] shadow-sm hover:bg-[var(--color-brand-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep('phone');
                setCode('');
                setError(null);
              }}
              className="mt-3 w-full text-center text-sm font-medium text-[var(--color-brand-contrast)] underline"
            >
              Change number
            </button>
          </>
        )}

        {error ? (
          <p
            className="mt-4 rounded-lg border border-[var(--color-brand-warm)] bg-[var(--color-brand-warm-soft)] px-3 py-2 text-sm text-[var(--color-brand-warm-strong)]"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <Link
          href="/"
          className="mt-8 block text-center text-sm text-[var(--text-tertiary)] hover:text-[var(--color-brand-contrast)]"
        >
          Back home
        </Link>
      </section>
    </main>
  );
}
