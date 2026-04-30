'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { joinCommunity } from '@sellr/api-client';
import { useAuth } from '@/components/auth-provider';

type JoinMode = 'invite' | 'email';

export default function OnboardingPage() {
  const router = useRouter();
  const { logout, refreshSession } = useAuth();
  const [mode, setMode] = useState<JoinMode>('invite');
  const [inviteCode, setInviteCode] = useState('');
  const [institutionalEmail, setInstitutionalEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          ? 'Enter the invite code from your community.'
          : 'Enter your school, workplace, or building email.',
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

      router.replace('/dashboard');
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Could not join this community. Check the details and try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  const onSignOut = () => {
    logout();
    router.push('/login');
  };

  return (
    <main className="min-h-screen bg-[var(--bg-secondary)] px-4 py-8 text-[var(--text-primary)]">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center">
        <div className="grid w-full gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <section className="space-y-5">
            <div className="inline-flex rounded-full border border-[var(--color-brand-accent-muted)] bg-[var(--color-brand-accent-soft)] px-3 py-1 text-xs font-medium text-[var(--color-brand-accent-strong)]">
              Community-first marketplace
            </div>
            <div className="space-y-3">
              <h1 className="max-w-xl text-3xl font-semibold sm:text-4xl">
                Join your local Sellr community.
              </h1>
              <p className="max-w-xl text-base leading-7 text-[var(--text-secondary)]">
                Sellr works best when every listing belongs to a trusted local
                group. Join with an invite code or a verified community email to
                browse, list, and contact nearby members.
              </p>
            </div>
            <div className="grid gap-3 text-sm text-[var(--text-secondary)] sm:grid-cols-3">
              <div className="rounded-lg border border-[var(--border-default)] bg-white p-4 shadow-sm">
                <p className="font-medium text-[var(--text-primary)]">
                  Local by default
                </p>
                <p className="mt-1">Only members of your community can browse.</p>
              </div>
              <div className="rounded-lg border border-[var(--border-default)] bg-white p-4 shadow-sm">
                <p className="font-medium text-[var(--text-primary)]">
                  Structured listings
                </p>
                <p className="mt-1">Clear prices, photos, and pickup context.</p>
              </div>
              <div className="rounded-lg border border-[var(--border-default)] bg-white p-4 shadow-sm">
                <p className="font-medium text-[var(--text-primary)]">
                  Cleaner intent
                </p>
                <p className="mt-1">Buyers and sellers start from the item.</p>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-[var(--border-default)] bg-white p-5 shadow-sm sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">
                  Verify community access
                </h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  This keeps Sellr focused on trusted local groups.
                </p>
              </div>
              <button
                type="button"
                onClick={onSignOut}
                className="rounded-md border border-[var(--border-default)] px-3 py-1.5 text-sm font-medium text-[var(--color-brand-contrast)] hover:bg-[var(--bg-secondary)]"
              >
                Sign out
              </button>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-2 rounded-lg bg-[var(--bg-tertiary)] p-1">
              <button
                type="button"
                aria-pressed={mode === 'invite'}
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
                aria-pressed={mode === 'email'}
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

            <form onSubmit={(event) => void onSubmit(event)} className="mt-6">
              {mode === 'invite' ? (
                <label className="block text-sm font-medium text-[var(--text-primary)]">
                  Invite code
                  <input
                    value={inviteCode}
                    onChange={(event) =>
                      setInviteCode(event.target.value.toUpperCase())
                    }
                    autoComplete="off"
                    placeholder="DEV2026"
                    className="mt-2 w-full rounded-lg border border-[var(--border-default)] bg-white px-3 py-2.5 font-mono text-sm uppercase text-[var(--text-primary)] outline-none focus:border-[var(--color-brand-contrast)] focus:ring-2 focus:ring-[var(--color-brand-contrast-muted)]"
                  />
                </label>
              ) : (
                <label className="block text-sm font-medium text-[var(--text-primary)]">
                  Community email
                  <input
                    value={institutionalEmail}
                    onChange={(event) =>
                      setInstitutionalEmail(event.target.value)
                    }
                    type="email"
                    autoComplete="email"
                    placeholder="you@school.edu"
                    className="mt-2 w-full rounded-lg border border-[var(--border-default)] bg-white px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--color-brand-contrast)] focus:ring-2 focus:ring-[var(--color-brand-contrast-muted)]"
                  />
                </label>
              )}

              {process.env.NODE_ENV === 'development' && mode === 'invite' ? (
                <p className="mt-2 text-xs text-[var(--text-tertiary)]">
                  Local seed invite: DEV2026
                </p>
              ) : null}

              {error ? (
                <p
                  className="mt-4 rounded-lg border border-[var(--color-error-light)] bg-[var(--color-error-light)] px-3 py-2 text-sm text-[var(--color-error)]"
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

            <p className="mt-5 text-center text-xs leading-5 text-[var(--text-tertiary)]">
              Your phone sign-in stays active. Community access can be expanded
              later from your profile.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
