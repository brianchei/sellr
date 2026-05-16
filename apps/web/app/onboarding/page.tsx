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
          Checking your session...
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
            <section className="app-panel p-5 sm:p-7">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand-contrast)]">
                Community access
              </p>
              <h1 className="mt-2 text-3xl font-semibold leading-tight text-[var(--text-primary)] sm:text-4xl">
                Verify Badger Market access
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
                Use the student email you signed in with. Invite codes are for
                organizer-approved members.
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

              <div
                role="tablist"
                aria-label="Choose a verification method"
                className="mt-6 grid grid-cols-2 gap-2 rounded-full bg-[var(--bg-tertiary)] p-1"
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
                  Verified email
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
                    We match the verified email already attached to this
                    account.
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
                      ? 'Unlock Badger Market'
                      : 'Join with invite code'}
                </button>
              </form>

              <details className="mt-5 text-xs text-[var(--text-tertiary)]">
                <summary className="cursor-pointer font-medium text-[var(--text-tertiary)] hover:text-[var(--color-brand-contrast)]">
                  Don&apos;t have an invite or community email?
                </summary>
                <p className="mt-2 leading-5">
                  Ask an organizer for a code, or sign out and sign back in
                  with the supported campus email tied to your community.
                </p>
              </details>

              <p className="mt-4 text-center text-xs leading-5 text-[var(--text-tertiary)]">
                Your exact contact stays private. Community access only scopes
                where you can browse, sell, and message.
              </p>
            </section>

            <aside className="space-y-4">
              <section className="app-panel-soft p-5">
                <h2 className="text-base font-semibold text-[var(--text-primary)]">
                  What opens next
                </h2>
                <ul className="mt-3 divide-y divide-[var(--border-default)]">
                  <NextStepItem
                    number="1"
                    title="Browse Badger Market"
                    body="Listings are scoped to the community you just joined."
                  />
                  <NextStepItem
                    number="2"
                    title="Sell when ready"
                    body="Your verified profile gives buyers basic seller context."
                  />
                  <NextStepItem
                    number="3"
                    title="Message from items"
                    body="Conversations stay tied to the listing and community."
                  />
                </ul>
              </section>

              <section className="app-section">
                <h2 className="text-base font-semibold text-[var(--text-primary)]">
                  Need an invite?
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  Ask a community organizer or moderator for a code. You can
                  also sign out and use the supported campus email tied to your
                  community.
                </p>
              </section>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}

function NextStepItem({
  number,
  title,
  body,
}: {
  number: string;
  title: string;
  body: string;
}) {
  return (
    <li className="py-3">
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--text-primary)] text-[11px] font-semibold text-[var(--color-brand-primary)]"
        >
          {number}
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
