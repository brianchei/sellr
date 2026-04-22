'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { sendOtp, setAccessToken, verifyOtp } from '@sellr/api-client';
import { useAuth } from '@/components/auth-provider';

export default function LoginPage() {
  const router = useRouter();
  const { hydrated, isAuthenticated, setSession } = useAuth();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneE164, setPhoneE164] = useState('+1');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hydrated && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [hydrated, isAuthenticated, router]);

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
      router.replace('/dashboard');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  if (!hydrated) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
        <p className="text-center text-sm text-zinc-500">Loading…</p>
      </main>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
        Sign in
      </h1>
      <p className="mt-2 text-sm text-zinc-600">
        Enter your phone in E.164 format (e.g. +15551234567). In development
        without Twilio, use code{' '}
        <span className="font-mono text-zinc-800">000000</span>.
      </p>

      {step === 'phone' ? (
        <>
          <label className="mt-8 block text-sm font-medium text-zinc-700">
            Phone
            <input
              value={phoneE164}
              onChange={(e) => setPhoneE164(e.target.value)}
              type="tel"
              autoComplete="tel"
              placeholder="+15551234567"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none ring-zinc-900 focus:ring-2"
            />
          </label>
          <button
            type="button"
            onClick={() => void onSendOtp()}
            disabled={loading || phoneE164.trim().length < 8}
            className="mt-4 w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? 'Sending…' : 'Send code'}
          </button>
        </>
      ) : (
        <>
          <p className="mt-8 text-sm text-zinc-600">
            Code sent to{' '}
            <span className="font-medium text-zinc-900">{phoneE164}</span>
          </p>
          <label className="mt-4 block text-sm font-medium text-zinc-700">
            Verification code
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-lg tracking-[0.3em] text-zinc-900 outline-none ring-zinc-900 focus:ring-2"
            />
          </label>
          <button
            type="button"
            onClick={() => void onVerify()}
            disabled={loading || code.length !== 6}
            className="mt-4 w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? 'Verifying…' : 'Verify'}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep('phone');
              setCode('');
              setError(null);
            }}
            className="mt-3 w-full text-center text-sm text-zinc-600 underline"
          >
            Change number
          </button>
        </>
      )}

      {error ? (
        <p className="mt-4 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <Link
        href="/"
        className="mt-10 text-center text-sm text-zinc-500 hover:text-zinc-800"
      >
        ← Back home
      </Link>
    </main>
  );
}
