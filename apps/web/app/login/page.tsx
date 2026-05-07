'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { sendOtp, setAccessToken, verifyOtp } from '@sellr/api-client';
import { useAuth } from '@/components/auth-provider';

const RESEND_COOLDOWN_SECONDS = 30;
const OTP_CODE_LENGTH = 6;

function getOtpErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  if (
    /body\/code|too small|too big|expected string|verification code/i.test(
      message,
    )
  ) {
    return 'Enter the 6-digit verification code.';
  }

  return message || 'Invalid or expired code';
}

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
  const [resendIn, setResendIn] = useState(0);
  const phoneInputRef = useRef<HTMLInputElement | null>(null);
  const codeInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (hydrated && isAuthenticated && communityIds !== null) {
      router.replace(communityIds.length > 0 ? '/dashboard' : '/onboarding');
    }
  }, [communityIds, hydrated, isAuthenticated, router]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setInterval(() => {
      setResendIn((value) => (value <= 1 ? 0 : value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendIn]);

  useEffect(() => {
    if (step === 'phone') {
      phoneInputRef.current?.focus();
    } else if (step === 'otp') {
      codeInputRef.current?.focus();
    }
  }, [step]);

  const onSendOtp = async () => {
    setError(null);
    setLoading(true);
    try {
      await sendOtp(phoneE164.trim());
      setStep('otp');
      setResendIn(RESEND_COOLDOWN_SECONDS);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    if (resendIn > 0 || loading) return;
    setError(null);
    setLoading(true);
    try {
      await sendOtp(phoneE164.trim());
      setResendIn(RESEND_COOLDOWN_SECONDS);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  const onVerify = async (verificationCode = code) => {
    const trimmedCode = verificationCode.trim();
    if (trimmedCode.length !== OTP_CODE_LENGTH) {
      setError('Enter the 6-digit verification code.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const res = await verifyOtp({
        phoneE164: phoneE164.trim(),
        code: trimmedCode,
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
      setError(getOtpErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading || phoneE164.trim().length < 8) return;
    void onSendOtp();
  };

  const handleOtpSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading || code.length !== OTP_CODE_LENGTH) return;
    void onVerify(code);
  };

  const onCodeChange = (raw: string) => {
    const next = raw.replace(/\D/g, '').slice(0, OTP_CODE_LENGTH);
    setCode(next);
    setError(null);
    if (next.length === OTP_CODE_LENGTH && !loading) {
      void onVerify(next);
    }
  };

  if (!hydrated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--bg-secondary)] px-6 py-16">
        <p className="text-center text-sm text-[var(--text-tertiary)]">
          Loading...
        </p>
      </main>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--bg-secondary)] px-6 py-12 sm:py-16">
      <section className="w-full max-w-md rounded-lg border border-[var(--border-default)] bg-white p-6 shadow-sm sm:p-7">
        <Link
          href="/"
          className="mb-7 inline-flex items-center gap-2 no-underline"
        >
          <Image
            src="/brand/sellr-logo-mark.png"
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 object-contain"
            priority
          />
          <span className="text-lg font-bold text-[var(--text-primary)]">
            Sellr
          </span>
        </Link>

        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand-contrast)]">
          Sign in
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">
          Sign in to Sellr
        </h1>
        <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
          We verify one phone per member so your community knows who they are
          buying from.
        </p>

        {step === 'phone' ? (
          <form onSubmit={handlePhoneSubmit} className="mt-6">
            <label className="block text-sm font-medium text-[var(--text-primary)]">
              Phone number
              <input
                ref={phoneInputRef}
                value={phoneE164}
                onChange={(e) => setPhoneE164(e.target.value)}
                type="tel"
                autoComplete="tel"
                placeholder="+15551234567"
                inputMode="tel"
                aria-describedby="login-phone-help"
                className="mt-1.5 w-full rounded-lg border border-[var(--border-default)] bg-white px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--color-brand-contrast)] focus:ring-2 focus:ring-[var(--color-brand-contrast-muted)]"
              />
            </label>
            <p
              id="login-phone-help"
              className="mt-1.5 text-xs text-[var(--text-tertiary)]"
            >
              Use international format like +15551234567. Standard SMS rates
              apply.
            </p>
            <button
              type="submit"
              disabled={loading || phoneE164.trim().length < 8}
              className="mt-4 w-full rounded-lg bg-[var(--color-brand-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] shadow-sm hover:bg-[var(--color-brand-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Sending code...' : 'Send code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit} className="mt-6">
            <p className="text-sm text-[var(--text-secondary)]">
              We sent a code to{' '}
              <span className="font-medium text-[var(--text-primary)]">
                {phoneE164}
              </span>
              .
            </p>
            <label className="mt-4 block text-sm font-medium text-[var(--text-primary)]">
              <span className="sr-only">Verification code</span>
              <input
                ref={codeInputRef}
                value={code}
                onChange={(e) => onCodeChange(e.target.value)}
                inputMode="numeric"
                pattern="\d*"
                autoComplete="one-time-code"
                maxLength={OTP_CODE_LENGTH}
                placeholder="000000"
                aria-label="6 digit verification code"
                className="w-full rounded-lg border border-[var(--border-default)] bg-white px-3 py-3 text-center font-mono text-xl tracking-[0.4em] text-[var(--text-primary)] outline-none focus:border-[var(--color-brand-contrast)] focus:ring-2 focus:ring-[var(--color-brand-contrast-muted)]"
              />
            </label>
            <button
              type="submit"
              disabled={loading || code.length !== OTP_CODE_LENGTH}
              className="mt-4 w-full rounded-lg bg-[var(--color-brand-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] shadow-sm hover:bg-[var(--color-brand-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify and continue'}
            </button>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
              <button
                type="button"
                onClick={() => void onResend()}
                disabled={resendIn > 0 || loading}
                className="font-medium text-[var(--color-brand-contrast)] hover:underline disabled:cursor-not-allowed disabled:text-[var(--text-tertiary)] disabled:no-underline"
              >
                {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep('phone');
                  setCode('');
                  setError(null);
                  setResendIn(0);
                }}
                className="font-medium text-[var(--text-tertiary)] hover:text-[var(--color-brand-contrast)] hover:underline"
              >
                Change number
              </button>
            </div>
          </form>
        )}

        {error ? (
          <p
            className="mt-4 rounded-lg border border-[var(--color-brand-warm)] bg-[var(--color-brand-warm-soft)] px-3 py-2 text-sm text-[var(--color-brand-warm-strong)]"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <ul className="mt-6 space-y-2 border-t border-[var(--border-default)] pt-5 text-xs text-[var(--text-secondary)]">
          <TrustPoint>
            We keep your number private from other community members.
          </TrustPoint>
          <TrustPoint>
            Verified phone is used to sign in and recover your account.
          </TrustPoint>
        </ul>

        <details className="mt-4 text-xs text-[var(--text-tertiary)]">
          <summary className="cursor-pointer font-medium text-[var(--text-tertiary)] hover:text-[var(--color-brand-contrast)]">
            Trouble receiving the code?
          </summary>
          <p className="mt-2 leading-5">
            Make sure the number is in international format (for example,{' '}
            <span className="font-mono">+15551234567</span>). In a development
            build without Twilio, the demo code is{' '}
            <span className="font-mono text-[var(--text-primary)]">000000</span>
            .
          </p>
        </details>

        <Link
          href="/"
          className="mt-6 block text-center text-sm font-medium text-[var(--text-tertiary)] no-underline hover:text-[var(--color-brand-contrast)]"
        >
          Back home
        </Link>
      </section>
    </main>
  );
}

function TrustPoint({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span
        aria-hidden="true"
        className="mt-0.5 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-accent-soft)] text-[var(--color-brand-accent-strong)]"
      >
        <svg
          width="9"
          height="9"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m5 12 5 5L20 7" />
        </svg>
      </span>
      <span className="leading-5">{children}</span>
    </li>
  );
}
