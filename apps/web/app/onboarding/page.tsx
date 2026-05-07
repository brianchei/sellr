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
import { useQueryClient } from '@tanstack/react-query';
import { joinCommunity } from '@sellr/api-client';
import { useAuth } from '@/components/auth-provider';

type JoinMode = 'invite' | 'email';

export default function OnboardingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    communityIds,
    hydrated,
    isAuthenticated,
    logout,
    refreshSession,
  } = useAuth();
  const [mode, setMode] = useState<JoinMode>('invite');
  const [inviteCode, setInviteCode] = useState('');
  const [institutionalEmail, setInstitutionalEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inviteInputRef = useRef<HTMLInputElement | null>(null);
  const emailInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (communityIds && communityIds.length > 0) {
      router.replace('/dashboard');
    }
  }, [communityIds, hydrated, isAuthenticated, router]);

  useEffect(() => {
    if (mode === 'invite') {
      inviteInputRef.current?.focus();
    } else {
      emailInputRef.current?.focus();
    }
  }, [mode]);

  const inviteValue = inviteCode.trim();
  const emailValue = institutionalEmail.trim();
  const canSubmit =
    mode === 'invite'
      ? inviteValue.length >= 3
      : emailValue.length > 5 && emailValue.includes('@');

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!canSubmit) {
      setError(
        mode === 'invite'
          ? 'Enter the invite code your community shared with you.'
          : 'Enter the email address tied to your school, workplace, or building.',
      );
      return;
    }

    setLoading(true);
    try {
      await joinCommunity(
        mode === 'invite'
          ? { inviteCode: inviteValue }
          : { institutionalEmail: emailValue },
      );
      const session = await refreshSession();

      if (!session || session.communityIds.length === 0) {
        setError('Joined, but your session did not update. Please try again.');
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ['me'] });
      router.replace('/dashboard');
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'We could not join this community. Check the details and try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  const onSignOut = () => {
    logout();
    router.push('/login');
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

  if (!isAuthenticated || (communityIds && communityIds.length > 0)) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-secondary)] text-[var(--text-primary)]">
      <header className="border-b border-[var(--border-default)] bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link
            href="/"
            className="flex items-center gap-2 no-underline"
            aria-label="Sellr home"
          >
            <Image
              src="/brand/sellr-logo-mark.png"
              alt=""
              width={28}
              height={28}
              className="h-7 w-7 object-contain"
              priority
            />
            <span className="text-base font-bold text-[var(--text-primary)]">
              Sellr
            </span>
          </Link>
          <button
            type="button"
            onClick={onSignOut}
            className="text-sm font-medium text-[var(--text-tertiary)] hover:text-[var(--color-brand-contrast)]"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 py-8 sm:py-12">
        <div className="mx-auto w-full max-w-5xl">
          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
            <section className="space-y-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand-contrast)]">
                One step left
              </p>
              <div className="space-y-3">
                <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
                  Join your local community to get started.
                </h1>
                <p className="max-w-xl text-base leading-7 text-[var(--text-secondary)]">
                  Sellr only works inside trusted local groups — campuses,
                  coworking spaces, residences, and invite-only neighborhoods.
                  Verifying community access is what makes browsing, listing,
                  and meeting up safer than a generic listings board.
                </p>
              </div>
              <ul className="grid gap-3 sm:grid-cols-1">
                <TrustPillar
                  title="Verified communities only"
                  body="Every listing belongs to a known, gated local group — not the open internet."
                />
                <TrustPillar
                  title="Identity-aware messaging"
                  body="Buyers and sellers know who they're talking to before any pickup is arranged."
                />
                <TrustPillar
                  title="Community accountability"
                  body="Reports, blocks, and member tenure keep flaky and unsafe behavior visible."
                />
              </ul>
            </section>

            <section className="rounded-lg border border-[var(--border-default)] bg-white p-5 shadow-sm sm:p-7">
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                Verify community access
              </h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Use the invite code your community shared, or a verified
                community email address.
              </p>

              <div
                role="tablist"
                aria-label="Choose a verification method"
                className="mt-5 grid grid-cols-2 gap-2 rounded-lg bg-[var(--bg-tertiary)] p-1"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'invite'}
                  aria-controls="onboarding-method-panel"
                  onClick={() => {
                    setMode('invite');
                    setError(null);
                  }}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                    mode === 'invite'
                      ? 'bg-white text-[var(--color-brand-contrast)] shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Invite code
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'email'}
                  aria-controls="onboarding-method-panel"
                  onClick={() => {
                    setMode('email');
                    setError(null);
                  }}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                    mode === 'email'
                      ? 'bg-white text-[var(--color-brand-contrast)] shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Community email
                </button>
              </div>

              <form
                id="onboarding-method-panel"
                onSubmit={(event) => void onSubmit(event)}
                className="mt-5"
              >
                {mode === 'invite' ? (
                  <label className="block text-sm font-medium text-[var(--text-primary)]">
                    Invite code
                    <input
                      ref={inviteInputRef}
                      value={inviteCode}
                      onChange={(event) =>
                        setInviteCode(event.target.value.toUpperCase())
                      }
                      autoComplete="off"
                      placeholder="DEV2026"
                      aria-describedby="onboarding-invite-help"
                      className="mt-1.5 w-full rounded-lg border border-[var(--border-default)] bg-white px-3 py-2.5 font-mono text-sm uppercase tracking-wider text-[var(--text-primary)] outline-none focus:border-[var(--color-brand-contrast)] focus:ring-2 focus:ring-[var(--color-brand-contrast-muted)]"
                    />
                  </label>
                ) : (
                  <label className="block text-sm font-medium text-[var(--text-primary)]">
                    Community email
                    <input
                      ref={emailInputRef}
                      value={institutionalEmail}
                      onChange={(event) =>
                        setInstitutionalEmail(event.target.value)
                      }
                      type="email"
                      autoComplete="email"
                      placeholder="you@school.edu"
                      aria-describedby="onboarding-email-help"
                      className="mt-1.5 w-full rounded-lg border border-[var(--border-default)] bg-white px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--color-brand-contrast)] focus:ring-2 focus:ring-[var(--color-brand-contrast-muted)]"
                    />
                  </label>
                )}

                {mode === 'invite' ? (
                  <p
                    id="onboarding-invite-help"
                    className="mt-1.5 text-xs text-[var(--text-tertiary)]"
                  >
                    Codes are case-insensitive.
                    {process.env.NODE_ENV === 'development' ? (
                      <>
                        {' '}
                        Local seed code:{' '}
                        <span className="font-mono text-[var(--text-secondary)]">
                          DEV2026
                        </span>
                        .
                      </>
                    ) : null}
                  </p>
                ) : (
                  <p
                    id="onboarding-email-help"
                    className="mt-1.5 text-xs text-[var(--text-tertiary)]"
                  >
                    We&apos;ll match your domain against allowlisted communities.
                  </p>
                )}

                {error ? (
                  <p
                    className="mt-4 rounded-lg border border-[var(--color-brand-warm)] bg-[var(--color-brand-warm-soft)] px-3 py-2 text-sm text-[var(--color-brand-warm-strong)]"
                    role="alert"
                  >
                    {error}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={loading || !canSubmit}
                  className="mt-5 w-full rounded-lg bg-[var(--color-brand-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] shadow-sm transition hover:bg-[var(--color-brand-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? 'Joining...' : 'Join community'}
                </button>
              </form>

              <details className="mt-5 text-xs text-[var(--text-tertiary)]">
                <summary className="cursor-pointer font-medium text-[var(--text-tertiary)] hover:text-[var(--color-brand-contrast)]">
                  Don&apos;t have an invite or community email?
                </summary>
                <p className="mt-2 leading-5">
                  Sellr is invite-only while we onboard new communities. Ask an
                  organizer or moderator in your community for an invite code,
                  or sign up with the email tied to your school, workplace, or
                  residence to check if it&apos;s already supported.
                </p>
              </details>

              <p className="mt-4 text-center text-xs leading-5 text-[var(--text-tertiary)]">
                Your phone sign-in stays active. You can join more communities
                later from your dashboard.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

function TrustPillar({ title, body }: { title: string; body: string }) {
  return (
    <li className="rounded-lg border border-[var(--border-default)] bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-accent-soft)] text-[var(--color-brand-accent-strong)]"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {title}
          </p>
          <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
            {body}
          </p>
        </div>
      </div>
    </li>
  );
}
