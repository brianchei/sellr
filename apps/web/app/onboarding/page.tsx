'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchMe, joinCommunity } from '@sellr/api-client';
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
    userId,
  } = useAuth();
  const [mode, setMode] = useState<JoinMode>('email');
  const [inviteCode, setInviteCode] = useState('');
  const [institutionalEmail, setInstitutionalEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inviteInputRef = useRef<HTMLInputElement | null>(null);
  const emailInputRef = useRef<HTMLInputElement | null>(null);

  const meQuery = useQuery({
    queryKey: ['me', userId],
    queryFn: fetchMe,
    enabled: hydrated && isAuthenticated && Boolean(userId),
  });
  const verifiedEmail =
    meQuery.data?.user.email && meQuery.data.user.emailVerifiedAt
      ? meQuery.data.user.email
      : null;

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

  useEffect(() => {
    if (verifiedEmail && institutionalEmail.trim().length === 0) {
      setInstitutionalEmail(verifiedEmail);
    }
  }, [institutionalEmail, verifiedEmail]);

  const inviteValue = inviteCode.trim();
  const emailValue = institutionalEmail.trim();
  const canSubmit =
    mode === 'invite'
      ? inviteValue.length >= 3
      : emailValue.length > 5 && emailValue.includes('@');
  const helpId =
    mode === 'invite' ? 'onboarding-invite-help' : 'onboarding-email-help';
  const describedBy = error ? `${helpId} onboarding-error` : helpId;

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!canSubmit) {
      setError(
        mode === 'invite'
          ? 'Enter the invite code your community shared with you.'
          : 'Enter your verified student email.',
      );
      return;
    }

    if (mode === 'email') {
      if (!verifiedEmail) {
        setError(
          'Sign in with your student email first, or use an invite code.',
        );
        return;
      }
      if (emailValue.toLowerCase() !== verifiedEmail.toLowerCase()) {
        setError('Use the same email you verified during sign-in.');
        return;
      }
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
      <main className="app-shell-bg flex min-h-screen items-center justify-center px-6 py-16">
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
    <div className="app-shell-bg flex min-h-screen flex-col text-[var(--text-primary)]">
      <header className="border-b border-black/10 bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link
            href="/"
            className="flex items-center gap-2 no-underline"
            aria-label="Sellr home"
          >
            <Image
              src="/brand/sellr-logo-full.png"
              alt=""
              width={112}
              height={36}
              className="h-8 w-auto object-contain"
              priority
            />
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
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
            <section className="app-panel-soft p-5 sm:p-7">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand-contrast)]">
                One step left
              </p>
              <h1 className="mt-2 text-3xl font-semibold leading-tight text-[var(--text-primary)] sm:text-4xl">
                Join Badger Market
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
                Badger Market is for verified UW-Madison members, so listings
                and messages stay local.
              </p>

              {verifiedEmail ? (
                <div className="app-list-row mt-5 flex items-start gap-3 border-[var(--color-brand-accent-muted)] bg-[var(--color-brand-accent-soft)] p-3">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-accent)] text-[var(--text-primary)]"
                  >
                    <CheckIcon />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand-accent-strong)]">
                      Verified email
                    </p>
                    <p className="mt-1 truncate text-sm font-semibold text-[var(--text-primary)]">
                      {verifiedEmail}
                    </p>
                  </div>
                </div>
              ) : null}

              <h2 className="mt-5 text-xl font-semibold text-[var(--text-primary)]">
                Verify community access
              </h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                UW-Madison students can join Badger Market with a verified
                wisc.edu email. If you received an invite, you can also join
                with an invite code.
              </p>

              <div
                role="tablist"
                aria-label="Choose a verification method"
                className="mt-5 grid grid-cols-2 gap-2 rounded-full bg-[var(--bg-tertiary)] p-1"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'email'}
                  aria-controls="onboarding-method-panel"
                  onClick={() => {
                    setMode('email');
                    setError(null);
                  }}
                  className={`rounded-full px-3 py-2 text-sm font-semibold transition ${
                    mode === 'email'
                      ? 'bg-[#111111] text-[var(--color-brand-primary)] shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Student email
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'invite'}
                  aria-controls="onboarding-method-panel"
                  onClick={() => {
                    setMode('invite');
                    setError(null);
                  }}
                  className={`rounded-full px-3 py-2 text-sm font-semibold transition ${
                    mode === 'invite'
                      ? 'bg-[#111111] text-[var(--color-brand-primary)] shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Invite code
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
                      placeholder="INVITE2026"
                      aria-describedby={describedBy}
                      aria-invalid={Boolean(error)}
                      className="app-field mt-1.5 px-3 py-2.5 font-mono text-sm uppercase tracking-wider"
                    />
                  </label>
                ) : (
                  <label className="block text-sm font-medium text-[var(--text-primary)]">
                    Student email
                    <input
                      ref={emailInputRef}
                      value={institutionalEmail}
                      onChange={(event) =>
                        setInstitutionalEmail(event.target.value)
                      }
                      type="email"
                      autoComplete="email"
                      placeholder="you@wisc.edu"
                      aria-describedby={describedBy}
                      readOnly={Boolean(verifiedEmail)}
                      aria-invalid={Boolean(error)}
                      className="app-field mt-1.5 px-3 py-2.5 text-sm"
                    />
                  </label>
                )}

                {mode === 'invite' ? (
                  <p
                    id="onboarding-invite-help"
                    className="mt-1.5 text-xs text-[var(--text-tertiary)]"
                  >
                    Codes are case-insensitive. Use the code shared by your
                    community organizer.
                  </p>
                ) : (
                  <p
                    id="onboarding-email-help"
                    className="mt-1.5 text-xs text-[var(--text-tertiary)]"
                  >
                    We&apos;ll match your verified email domain against
                    allowlisted communities.
                  </p>
                )}

                {error ? (
                  <p
                    id="onboarding-error"
                    className="app-alert mt-4 px-3 py-2 text-sm"
                    role="alert"
                  >
                    {error}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={loading || !canSubmit}
                  className="app-action-primary mt-5 w-full px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading
                    ? 'Joining...'
                    : mode === 'email'
                      ? 'Join with verified email'
                      : 'Join with invite code'}
                </button>
              </form>

              <details className="mt-5 text-xs text-[var(--text-tertiary)]">
                <summary className="cursor-pointer font-medium text-[var(--text-tertiary)] hover:text-[var(--color-brand-contrast)]">
                  Don&apos;t have an invite or community email?
                </summary>
                <p className="mt-2 leading-5">
                  Sellr is invite-only while we onboard new communities. Ask an
                  organizer or moderator in your community for an invite code,
                  or sign out and sign back in with the student email tied to a
                  supported campus community.
                </p>
              </details>

              <p className="mt-4 text-center text-xs leading-5 text-[var(--text-tertiary)]">
                Your verified contact stays private. You can join more
                communities later from Home.
              </p>
            </section>

            <aside className="space-y-4">
              <section className="app-panel p-5">
                <h2 className="text-base font-semibold text-[var(--text-primary)]">
                  After you join
                </h2>
                <ul className="mt-4 grid gap-3">
                  <TrustPillar
                    title="Browse local listings"
                    body="Marketplace results use your verified community context."
                  />
                  <TrustPillar
                    title="Sell when ready"
                    body="Your profile and verified contact help buyers understand who is posting."
                  />
                  <TrustPillar
                    title="Message from an item"
                    body="Conversations stay tied to the listing and community they affect."
                  />
                </ul>
              </section>

              <section className="app-panel p-5">
                <h2 className="text-base font-semibold text-[var(--text-primary)]">
                  Invite codes
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  Codes remain available for trusted seed sellers and early
                  members whose access comes from a community organizer.
                </p>
              </section>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}

function TrustPillar({ title, body }: { title: string; body: string }) {
  return (
    <li className="app-list-row p-4">
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-accent-soft)] text-[var(--color-brand-accent-strong)]"
        >
          <CheckIcon />
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

function CheckIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m5 12 5 5L20 7" />
    </svg>
  );
}
