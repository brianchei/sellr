'use client';

import {
  ApiError,
  createCommunityInviteCode,
  fetchCommunityAdmin,
  updateCommunityMember,
} from '@sellr/api-client';
import type {
  ApiCommunityAdminCommunity,
  ApiCommunityAdminMember,
  ApiCommunityMemberRole,
  ApiCommunityMemberStatus,
} from '@sellr/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useAuth } from '@/components/auth-provider';

function formatDate(value: string | null) {
  if (!value) return 'No expiration';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatShortDate(value: string | null) {
  if (!value) return 'None';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

function toIsoFromLocalDateTime(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function memberContact(member: ApiCommunityAdminMember): string {
  return member.user.email ?? member.user.phoneE164 ?? 'No contact on file';
}

function inviteState(
  invite: ApiCommunityAdminCommunity['inviteCodes'][number],
) {
  if (invite.expiresAt && new Date(invite.expiresAt) <= new Date()) {
    return 'expired';
  }
  if (invite.maxUses != null && invite.useCount >= invite.maxUses) {
    return 'used up';
  }
  return 'active';
}

function statusTone(status: ApiCommunityMemberStatus) {
  if (status === 'active') {
    return {
      background: 'var(--color-brand-accent-soft)',
      color: 'var(--color-brand-accent-strong)',
    };
  }
  return {
    background: 'var(--bg-tertiary)',
    color: 'var(--text-secondary)',
  };
}

function roleTone(role: ApiCommunityMemberRole) {
  if (role === 'admin') {
    return {
      background: 'var(--color-brand-contrast-soft)',
      color: 'var(--color-brand-contrast)',
    };
  }
  return {
    background: 'var(--bg-secondary)',
    color: 'var(--text-secondary)',
  };
}

function inviteTone(state: string) {
  if (state === 'active') {
    return {
      background: 'var(--color-brand-accent-soft)',
      color: 'var(--color-brand-accent-strong)',
    };
  }
  if (state === 'expired') {
    return {
      background: 'var(--color-brand-warm-soft)',
      color: 'var(--color-brand-warm-strong)',
    };
  }
  return {
    background: 'var(--bg-tertiary)',
    color: 'var(--text-secondary)',
  };
}

function AdminRestricted() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <section
        className="rounded-lg border border-[var(--border-default)] bg-white p-8 shadow-sm"
        role="alert"
      >
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand-contrast)]">
          Admin
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
          Community setup is restricted
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
          Your current account is authenticated, but it does not have an active
          admin role in any community.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex w-full justify-center rounded-lg bg-[var(--color-brand-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] no-underline shadow-sm hover:bg-[var(--color-brand-primary-hover)] sm:w-auto"
        >
          Back to dashboard
        </Link>
      </section>
    </main>
  );
}

function SetupSkeleton() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <div className="animate-pulse">
        <div className="h-4 w-24 rounded bg-[var(--bg-tertiary)]" />
        <div className="mt-3 h-8 w-72 rounded bg-[var(--bg-tertiary)]" />
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-24 rounded-lg border border-[var(--border-default)] bg-white"
            />
          ))}
        </div>
        <div className="mt-6 h-96 rounded-lg border border-[var(--border-default)] bg-white" />
      </div>
    </main>
  );
}

export default function AdminCommunityPage() {
  const queryClient = useQueryClient();
  const { refreshSession, userId } = useAuth();
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(
    null,
  );
  const [inviteCode, setInviteCode] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [expiresAtLocal, setExpiresAtLocal] = useState('');
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [memberError, setMemberError] = useState<string | null>(null);

  const adminQuery = useQuery({
    queryKey: ['community-admin'],
    queryFn: fetchCommunityAdmin,
  });

  const communities = adminQuery.data?.communities ?? [];
  const selectedCommunity =
    communities.find((community) => community.id === selectedCommunityId) ??
    communities[0] ??
    null;

  const activeAdminCount = useMemo(() => {
    if (!selectedCommunity) return 0;
    return selectedCommunity.members.filter(
      (member) => member.role === 'admin' && member.status === 'active',
    ).length;
  }, [selectedCommunity]);

  const inviteMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCommunity) {
        throw new Error('Choose a community first.');
      }
      const trimmedCode = inviteCode.trim().toUpperCase();
      if (trimmedCode.length < 3) {
        throw new Error('Invite code must be at least 3 characters.');
      }
      const parsedMaxUses = maxUses.trim() ? Number(maxUses) : null;
      if (
        parsedMaxUses != null &&
        (!Number.isInteger(parsedMaxUses) || parsedMaxUses < 1)
      ) {
        throw new Error('Max uses must be a whole number.');
      }
      const expiresAt = toIsoFromLocalDateTime(expiresAtLocal);
      if (expiresAtLocal && !expiresAt) {
        throw new Error('Expiration date is invalid.');
      }

      return createCommunityInviteCode(selectedCommunity.id, {
        code: trimmedCode,
        maxUses: parsedMaxUses,
        expiresAt,
      });
    },
    onSuccess: async (result) => {
      setInviteCode('');
      setMaxUses('');
      setExpiresAtLocal('');
      setFormError(null);
      setFormMessage(`Created invite ${result.inviteCode.code}.`);
      await queryClient.invalidateQueries({ queryKey: ['community-admin'] });
    },
    onError: (error) => {
      setFormMessage(null);
      setFormError(
        error instanceof Error ? error.message : 'Could not create invite.',
      );
    },
  });

  const memberMutation = useMutation({
    mutationFn: ({
      communityId,
      member,
      body,
    }: {
      communityId: string;
      member: ApiCommunityAdminMember;
      body: {
        role?: ApiCommunityMemberRole;
        status?: ApiCommunityMemberStatus;
      };
    }) => updateCommunityMember(communityId, member.userId, body),
    onSuccess: async () => {
      setMemberError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['community-admin'] }),
        refreshSession(),
      ]);
    },
    onError: (error) => {
      setMemberError(
        error instanceof Error ? error.message : 'Could not update member.',
      );
    },
  });

  if (adminQuery.isLoading) {
    return <SetupSkeleton />;
  }

  if (
    adminQuery.isError &&
    adminQuery.error instanceof ApiError &&
    adminQuery.error.status === 403
  ) {
    return <AdminRestricted />;
  }

  if (adminQuery.isError) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <section
          className="rounded-lg border border-[var(--color-brand-warm)] bg-[var(--color-brand-warm-soft)] p-6 text-[var(--color-brand-warm-strong)]"
          role="alert"
        >
          <h1 className="text-lg font-semibold">
            Could not load community setup
          </h1>
          <p className="mt-2 text-sm">
            {adminQuery.error instanceof Error
              ? adminQuery.error.message
              : 'Refresh and try again.'}
          </p>
        </section>
      </main>
    );
  }

  if (!selectedCommunity) {
    return <AdminRestricted />;
  }

  const memberCount = selectedCommunity.members.length;
  const activeMemberCount = selectedCommunity.members.filter(
    (member) => member.status === 'active',
  ).length;
  const activeInviteCount = selectedCommunity.inviteCodes.filter(
    (invite) => inviteState(invite) === 'active',
  ).length;

  const runMemberUpdate = (
    member: ApiCommunityAdminMember,
    body: {
      role?: ApiCommunityMemberRole;
      status?: ApiCommunityMemberStatus;
    },
  ) => {
    if (!selectedCommunity) return;
    const nextRole = body.role ?? member.role;
    const nextStatus = body.status ?? member.status;
    const removesActiveAdmin =
      member.role === 'admin' &&
      member.status === 'active' &&
      !(nextRole === 'admin' && nextStatus === 'active');

    if (removesActiveAdmin && activeAdminCount <= 1) {
      setMemberError('A community must have at least one active admin.');
      return;
    }

    const isDeactivation = body.status === 'inactive';
    const isAdminDemotion = member.role === 'admin' && body.role === 'member';
    if (
      (isDeactivation || isAdminDemotion) &&
      !window.confirm(
        isDeactivation
          ? `Deactivate ${member.user.displayName}? They will lose community access after their current session refreshes.`
          : `Demote ${member.user.displayName} from admin to member?`,
      )
    ) {
      return;
    }

    memberMutation.mutate({
      communityId: selectedCommunity.id,
      member,
      body,
    });
  };

  const pendingUserId = memberMutation.variables?.member.userId ?? null;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand-contrast)]">
            Admin
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">
            Community setup
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            Manage invite codes and member access for communities where you are
            an active admin.
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <Link
            href="/admin/reports"
            className="inline-flex flex-1 justify-center rounded-lg border border-[var(--border-default)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-brand-contrast)] no-underline shadow-sm hover:bg-[var(--bg-secondary)] sm:flex-none"
          >
            Reports
          </Link>
          <button
            type="button"
            onClick={() => void adminQuery.refetch()}
            disabled={adminQuery.isFetching}
            className="inline-flex flex-1 justify-center rounded-lg border border-[var(--border-default)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-brand-contrast)] shadow-sm hover:bg-[var(--bg-secondary)] disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
          >
            {adminQuery.isFetching ? 'Refreshing' : 'Refresh'}
          </button>
        </div>
      </header>

      <section className="mt-5">
        <label className="block text-sm font-medium text-[var(--text-primary)]">
          Community
          <select
            value={selectedCommunity.id}
            onChange={(event) => {
              setSelectedCommunityId(event.target.value);
              setFormError(null);
              setFormMessage(null);
              setMemberError(null);
            }}
            className="mt-1.5 w-full rounded-lg border border-[var(--border-default)] bg-white px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--color-brand-contrast)] focus:ring-2 focus:ring-[var(--color-brand-contrast-muted)] sm:max-w-md"
          >
            {communities.map((community) => (
              <option key={community.id} value={community.id}>
                {community.name}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="mt-5 grid gap-3 sm:grid-cols-3">
        <MetricCard label="Members" value={String(memberCount)}>
          {activeMemberCount} active
        </MetricCard>
        <MetricCard label="Admins" value={String(activeAdminCount)}>
          Last-admin protection enabled
        </MetricCard>
        <MetricCard label="Invites" value={String(activeInviteCount)}>
          {selectedCommunity.inviteCodes.length} total codes
        </MetricCard>
      </section>

      <section className="mt-6 grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-lg border border-[var(--border-default)] bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Invite codes
              </h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Create a code for new members. Codes are stored uppercase.
              </p>
            </div>
          </div>

          <form
            className="mt-4 grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              inviteMutation.mutate();
            }}
          >
            <label className="text-sm font-medium text-[var(--text-primary)]">
              Code
              <input
                value={inviteCode}
                onChange={(event) =>
                  setInviteCode(event.target.value.toUpperCase())
                }
                placeholder="INVITE2026"
                autoComplete="off"
                className="mt-1.5 w-full rounded-lg border border-[var(--border-default)] bg-white px-3 py-2.5 font-mono text-sm uppercase tracking-wider text-[var(--text-primary)] outline-none focus:border-[var(--color-brand-contrast)] focus:ring-2 focus:ring-[var(--color-brand-contrast-muted)]"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium text-[var(--text-primary)]">
                Max uses
                <input
                  value={maxUses}
                  onChange={(event) => setMaxUses(event.target.value)}
                  inputMode="numeric"
                  placeholder="Unlimited"
                  className="mt-1.5 w-full rounded-lg border border-[var(--border-default)] bg-white px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--color-brand-contrast)] focus:ring-2 focus:ring-[var(--color-brand-contrast-muted)]"
                />
              </label>
              <label className="text-sm font-medium text-[var(--text-primary)]">
                Expires
                <input
                  type="datetime-local"
                  value={expiresAtLocal}
                  onChange={(event) => setExpiresAtLocal(event.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-[var(--border-default)] bg-white px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--color-brand-contrast)] focus:ring-2 focus:ring-[var(--color-brand-contrast-muted)]"
                />
              </label>
            </div>

            {formError ? (
              <p
                className="rounded-lg border border-[var(--color-brand-warm)] bg-[var(--color-brand-warm-soft)] px-3 py-2 text-sm text-[var(--color-brand-warm-strong)]"
                role="alert"
              >
                {formError}
              </p>
            ) : null}
            {formMessage ? (
              <p
                className="rounded-lg border border-[var(--border-default)] bg-[var(--color-brand-accent-soft)] px-3 py-2 text-sm text-[var(--color-brand-accent-strong)]"
                role="status"
              >
                {formMessage}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={inviteMutation.isPending}
              className="rounded-lg bg-[var(--color-brand-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] shadow-sm transition hover:bg-[var(--color-brand-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {inviteMutation.isPending ? 'Creating...' : 'Create invite'}
            </button>
          </form>

          <div className="mt-5 space-y-2">
            {selectedCommunity.inviteCodes.length === 0 ? (
              <p className="rounded-lg border border-dashed border-[var(--border-strong)] bg-[var(--bg-secondary)] px-4 py-5 text-center text-sm text-[var(--text-secondary)]">
                No invite codes yet.
              </p>
            ) : (
              selectedCommunity.inviteCodes.map((invite) => {
                const state = inviteState(invite);
                return (
                  <article
                    key={invite.id}
                    className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-mono text-sm font-semibold tracking-wider text-[var(--text-primary)]">
                        {invite.code}
                      </p>
                      <span
                        className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide"
                        style={inviteTone(state)}
                      >
                        {state}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-[var(--text-secondary)]">
                      {invite.maxUses == null
                        ? `${invite.useCount} uses - unlimited`
                        : `${invite.useCount} of ${invite.maxUses} uses`}
                      {' · '}
                      Expires {formatShortDate(invite.expiresAt)}
                    </p>
                  </article>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border-default)] bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Members
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Promote admins, deactivate access, or reactivate members.
            </p>
          </div>

          {memberError ? (
            <p
              className="mt-4 rounded-lg border border-[var(--color-brand-warm)] bg-[var(--color-brand-warm-soft)] px-3 py-2 text-sm text-[var(--color-brand-warm-strong)]"
              role="alert"
            >
              {memberError}
            </p>
          ) : null}

          <div className="mt-4 space-y-3">
            {selectedCommunity.members.map((member) => {
              const isPending =
                memberMutation.isPending && pendingUserId === member.userId;
              const memberIsLastActiveAdmin =
                member.role === 'admin' &&
                member.status === 'active' &&
                activeAdminCount <= 1;
              return (
                <article
                  key={member.userId}
                  className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-sm font-semibold text-[var(--text-primary)]">
                          {member.user.displayName}
                          {member.userId === userId ? ' (you)' : ''}
                        </h3>
                        <span
                          className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide"
                          style={roleTone(member.role)}
                        >
                          {member.role}
                        </span>
                        <span
                          className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide"
                          style={statusTone(member.status)}
                        >
                          {member.status}
                        </span>
                      </div>
                      <p className="mt-1 font-mono text-xs text-[var(--text-tertiary)]">
                        {memberContact(member)}
                      </p>
                      <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                        Joined {formatDate(member.joinedAt)}
                      </p>
                    </div>

                    <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
                      {member.role === 'admin' ? (
                        <button
                          type="button"
                          disabled={isPending || memberIsLastActiveAdmin}
                          onClick={() =>
                            runMemberUpdate(member, { role: 'member' })
                          }
                          className="flex-1 rounded-lg border border-[var(--border-default)] bg-white px-3 py-2 text-xs font-medium text-[var(--text-secondary)] shadow-sm hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
                        >
                          Demote
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() =>
                            runMemberUpdate(member, { role: 'admin' })
                          }
                          className="flex-1 rounded-lg border border-[var(--border-default)] bg-white px-3 py-2 text-xs font-medium text-[var(--color-brand-contrast)] shadow-sm hover:bg-[var(--bg-secondary)] disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
                        >
                          Promote
                        </button>
                      )}

                      {member.status === 'active' ? (
                        <button
                          type="button"
                          disabled={isPending || memberIsLastActiveAdmin}
                          onClick={() =>
                            runMemberUpdate(member, { status: 'inactive' })
                          }
                          className="flex-1 rounded-lg border border-[var(--color-brand-warm)] bg-white px-3 py-2 text-xs font-medium text-[var(--color-brand-warm-strong)] shadow-sm hover:bg-[var(--color-brand-warm-soft)] disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() =>
                            runMemberUpdate(member, { status: 'active' })
                          }
                          className="flex-1 rounded-lg bg-[var(--color-brand-primary)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] shadow-sm hover:bg-[var(--color-brand-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
                        >
                          Reactivate
                        </button>
                      )}
                    </div>
                  </div>
                  {memberIsLastActiveAdmin ? (
                    <p className="mt-3 text-xs text-[var(--text-tertiary)]">
                      This is the last active admin for this community.
                    </p>
                  ) : null}
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}

function MetricCard({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-lg border border-[var(--border-default)] bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold text-[var(--text-primary)]">
        {value}
      </p>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">{children}</p>
    </article>
  );
}
