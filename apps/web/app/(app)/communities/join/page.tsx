'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchMe, joinCommunity } from '@sellr/api-client';
import { useAuth } from '@/components/auth-provider';

type JoinMode = 'invite' | 'email';

function fieldClassName(hasError: boolean): string {
  return `app-field mt-1.5 px-3 py-2.5 text-sm ${
    hasError ? 'border-[var(--color-brand-warm)]' : ''
  }`;
}

export default function JoinCommunityPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { refreshSession, userId } = useAuth();
  const inviteInputRef = useRef<HTMLInputElement | null>(null);
  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const [mode, setMode] = useState<JoinMode>('invite');
  const [inviteCode, setInviteCode] = useState('');
  const [institutionalEmail, setInstitutionalEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const meQuery = useQuery({
    queryKey: ['me', userId],
    queryFn: fetchMe,
    enabled: Boolean(userId),
  });

  const verifiedEmail =
    meQuery.data?.user.email && meQuery.data.user.emailVerifiedAt
      ? meQuery.data.user.email
      : null;
  const currentCommunityCount = meQuery.data?.communityIds.length ?? 0;
  const inviteValue = inviteCode.trim();
  const emailValue = (institutionalEmail.trim() || verifiedEmail || '').trim();
  const canSubmit =
    mode === 'invite'
      ? inviteValue.length >= 3
      : emailValue.length > 5 && emailValue.includes('@');
  const helpId = mode === 'invite' ? 'join-invite-help' : 'join-email-help';
  const describedBy = error ? `${helpId} join-community-error` : helpId;

  const selectMode = (nextMode: JoinMode) => {
    setMode(nextMode);
    setError(null);
    if (nextMode === 'email' && !institutionalEmail && verifiedEmail) {
      setInstitutionalEmail(verifiedEmail);
    }
    requestAnimationFrame(() => {
      if (nextMode === 'invite') {
        inviteInputRef.current?.focus();
      } else {
        emailInputRef.current?.focus();
      }
    });
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!canSubmit) {
      setError(
        mode === 'invite'
          ? 'Enter the invite code your community shared with you.'
          : 'Enter the verified email attached to your Sellr account.',
      );
      return;
    }

    if (mode === 'email') {
      if (!verifiedEmail) {
        setError(
          'This account does not have a verified email yet. Use an invite code for now.',
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
      const joined = await joinCommunity(
        mode === 'invite'
          ? { inviteCode: inviteValue }
          : { institutionalEmail: emailValue },
      );
      const session = await refreshSession(joined.communityId);

      if (!session?.communityIds.includes(joined.communityId)) {
        setError('Joined, but your session did not update. Please try again.');
        return;
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['me'] }),
        queryClient.invalidateQueries({ queryKey: ['community-detail'] }),
        queryClient.invalidateQueries({ queryKey: ['community-listings'] }),
        queryClient.invalidateQueries({ queryKey: ['my-listings'] }),
      ]);
      router.replace(`/communities/${joined.communityId}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'We could not join this community. Check the details and try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 pb-10 sm:py-8">
      <header className="border-b border-[var(--border-default)] pb-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand-contrast)]">
              Add community access
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">
              Join a community
            </h1>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              Use an invite code or your verified email. After joining, Sellr
              switches your active community to that local marketplace.
            </p>
          </div>
          <div className="rounded-full border border-[var(--color-brand-accent-muted)] bg-[var(--color-brand-accent-soft)] px-4 py-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand-accent-strong)]">
              Current access
            </p>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {currentCommunityCount === 0
                ? 'No active communities'
                : `${currentCommunityCount} active ${
                    currentCommunityCount === 1 ? 'community' : 'communities'
                  }`}
            </p>
          </div>
        </div>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="app-panel p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Access details
          </h2>
          <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
            Invite codes work for organizer-approved access. Verified email
            works when a community is tied to your account.
          </p>

          <div
            role="tablist"
            aria-label="Choose a community join method"
            className="mt-5 grid grid-cols-2 gap-2 rounded-full bg-[var(--bg-tertiary)] p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'invite'}
              aria-controls="join-community-panel"
              onClick={() => selectMode('invite')}
              className={`rounded-full px-3 py-2 text-sm font-semibold transition ${
                mode === 'invite'
                  ? 'bg-[#111111] text-[var(--color-brand-primary)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Invite code
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'email'}
              aria-controls="join-community-panel"
              onClick={() => selectMode('email')}
              className={`rounded-full px-3 py-2 text-sm font-semibold transition ${
                mode === 'email'
                  ? 'bg-[#111111] text-[var(--color-brand-primary)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Verified email
            </button>
          </div>

          <form
            id="join-community-panel"
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
                  className={`${fieldClassName(Boolean(error))} font-mono uppercase tracking-wider`}
                />
              </label>
            ) : (
              <label className="block text-sm font-medium text-[var(--text-primary)]">
                Verified email
                <input
                  ref={emailInputRef}
                  value={institutionalEmail || verifiedEmail || ''}
                  onChange={(event) =>
                    setInstitutionalEmail(event.target.value)
                  }
                  type="email"
                  autoComplete="email"
                  placeholder="you@wisc.edu"
                  aria-describedby={describedBy}
                  readOnly={Boolean(verifiedEmail)}
                  aria-invalid={Boolean(error)}
                  className={fieldClassName(Boolean(error))}
                />
              </label>
            )}

            {mode === 'invite' ? (
              <p
                id="join-invite-help"
                className="mt-1.5 text-xs leading-5 text-[var(--text-tertiary)]"
              >
                Codes are case-insensitive. Use the code shared by the
                community organizer.
              </p>
            ) : (
              <p
                id="join-email-help"
                className="mt-1.5 text-xs leading-5 text-[var(--text-tertiary)]"
              >
                Sellr can only join email communities through the address
                already verified on this account.
              </p>
            )}

            {error ? (
              <p
                id="join-community-error"
                className="app-alert mt-4 px-3 py-2 text-sm"
                role="alert"
              >
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading || !canSubmit || meQuery.isLoading}
              className="app-action-primary mt-5 w-full px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? 'Joining...'
                : mode === 'invite'
                  ? 'Join with invite code'
                  : 'Join with verified email'}
            </button>
          </form>
        </section>

        <aside className="space-y-5">
          <section className="app-panel-soft p-5">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Next after joining
            </h2>
            <ul className="mt-3 divide-y divide-[var(--border-default)]">
              <GuidanceItem
                number="1"
                text="Your active community switches to the one you joined."
              />
              <GuidanceItem
                number="2"
                text="Browse, sell, and messages use that community context."
              />
              <GuidanceItem
                number="3"
                text="You can switch communities from the app header."
              />
            </ul>
          </section>

          <section className="app-section">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Need a code?
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              Ask a community organizer for an invite. Sellr keeps local
              listings and messages scoped to verified members.
            </p>
          </section>
        </aside>
      </div>
    </main>
  );
}

function GuidanceItem({ number, text }: { number: string; text: string }) {
  return (
    <li className="flex gap-3 py-3">
      <span
        aria-hidden="true"
        className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--text-primary)] text-[11px] font-semibold text-[var(--color-brand-primary)]"
      >
        {number}
      </span>
      <p className="text-sm leading-6 text-[var(--text-secondary)]">{text}</p>
    </li>
  );
}
