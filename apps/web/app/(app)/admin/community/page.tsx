'use client';

import {
  ApiError,
  createCommunityInviteCode,
  fetchCommunityAdmin,
  updateCommunityDetails,
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
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/auth-provider';

const COMMUNITY_QUERY_PARAM = 'communityId';
const MEMBER_SEARCH_QUERY_PARAM = 'memberSearch';

type MemberFilter = 'all' | 'active' | 'inactive' | 'admins' | 'members';

const MEMBER_FILTER_OPTIONS: Array<{ id: MemberFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'inactive', label: 'Inactive' },
  { id: 'admins', label: 'Admins' },
  { id: 'members', label: 'Members' },
];

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

function memberSearchText(member: ApiCommunityAdminMember): string {
  return [
    member.user.displayName,
    member.user.email,
    member.user.phoneE164,
    member.role,
    member.status,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function memberMatchesFilter(
  member: ApiCommunityAdminMember,
  filter: MemberFilter,
): boolean {
  if (filter === 'active') return member.status === 'active';
  if (filter === 'inactive') return member.status === 'inactive';
  if (filter === 'admins') return member.role === 'admin';
  if (filter === 'members') return member.role === 'member';
  return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function communityTypeLabel(type: ApiCommunityAdminCommunity['type']): string {
  if (type === 'coworking') return 'Coworking';
  if (type === 'residential') return 'Residential';
  return 'Campus';
}

function accessMethodLabel(community: ApiCommunityAdminCommunity): string {
  if (community.accessMethod === 'email_domain' && community.emailDomain) {
    return `${community.emailDomain} email`;
  }
  if (community.accessMethod === 'email_domain') return 'Verified email';
  return 'Invite code';
}

function activeMemberCount(community: ApiCommunityAdminCommunity): number {
  return community.members.filter((member) => member.status === 'active')
    .length;
}

function readRequestedCommunityId(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get(
    COMMUNITY_QUERY_PARAM,
  );
}

function readRequestedMemberSearch(): string {
  if (typeof window === 'undefined') return '';
  return (
    new URLSearchParams(window.location.search).get(
      MEMBER_SEARCH_QUERY_PARAM,
    ) ?? ''
  );
}

function writeSelectedCommunityUrl(communityId: string): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.set(COMMUNITY_QUERY_PARAM, communityId);
  window.history.replaceState(null, '', `${url.pathname}${url.search}`);
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

function editableRuleText(rule: unknown): string | null {
  if (typeof rule === 'string') return rule.trim() || null;
  if (!isRecord(rule)) return null;

  const title = typeof rule.title === 'string' ? rule.title.trim() : '';
  const body =
    typeof rule.body === 'string'
      ? rule.body.trim()
      : typeof rule.description === 'string'
        ? rule.description.trim()
        : '';

  if (title && body) return `${title}: ${body}`;
  return title || body || null;
}

function rulesToTextareaValue(rules: unknown): string {
  if (!Array.isArray(rules)) return '';
  return rules
    .map(editableRuleText)
    .filter((rule): rule is string => Boolean(rule))
    .join('\n');
}

function parseRulesInput(value: string): string[] {
  return value
    .split('\n')
    .map((rule) => rule.trim())
    .filter(Boolean);
}

function AdminRestricted() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <section
        className="app-panel p-8"
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
          className="app-action-primary mt-6 w-full px-4 py-2.5 text-sm sm:w-auto"
        >
          Back to dashboard
        </Link>
      </section>
    </main>
  );
}

function CommunityDetailsForm({
  community,
  onSaved,
}: {
  community: ApiCommunityAdminCommunity;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState(community.name);
  const [type, setType] = useState<ApiCommunityAdminCommunity['type']>(
    community.type,
  );
  const [accessMethod, setAccessMethod] = useState<
    ApiCommunityAdminCommunity['accessMethod']
  >(community.accessMethod);
  const [emailDomain, setEmailDomain] = useState(community.emailDomain ?? '');
  const [rulesText, setRulesText] = useState(rulesToTextareaValue(community.rules));
  const [detailsMessage, setDetailsMessage] = useState<string | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const detailsMutation = useMutation({
    mutationFn: () => {
      const trimmedName = name.trim();
      const normalizedEmailDomain = emailDomain.trim().toLowerCase();
      if (trimmedName.length < 3) {
        throw new Error('Community name must be at least 3 characters.');
      }
      if (accessMethod === 'email_domain' && !normalizedEmailDomain) {
        throw new Error('Email-domain communities require an email domain.');
      }

      return updateCommunityDetails(community.id, {
        name: trimmedName,
        type,
        accessMethod,
        emailDomain:
          accessMethod === 'email_domain' ? normalizedEmailDomain : null,
        rules: parseRulesInput(rulesText),
      });
    },
    onSuccess: async () => {
      setDetailsError(null);
      setDetailsMessage('Community details saved.');
      await onSaved();
    },
    onError: (error) => {
      setDetailsMessage(null);
      setDetailsError(
        error instanceof Error
          ? error.message
          : 'Could not save community details.',
      );
    },
  });

  return (
    <section className="app-panel mt-5 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Community details
          </h2>
          <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
            Edit the member-facing basics shown on the community homepage and in
            app-wide community context.
          </p>
        </div>
      </div>

      <form
        className="mt-4 grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          detailsMutation.mutate();
        }}
      >
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
          <label className="text-sm font-medium text-[var(--text-primary)]">
            Community name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={100}
              className="mt-1.5 w-full rounded-2xl border border-black/10 bg-white/90 px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--color-brand-contrast)] focus:ring-2 focus:ring-[var(--color-brand-contrast-muted)]"
            />
          </label>

          <label className="text-sm font-medium text-[var(--text-primary)]">
            Community type
            <select
              value={type}
              onChange={(event) =>
                setType(
                  event.target.value as ApiCommunityAdminCommunity['type'],
                )
              }
              className="mt-1.5 w-full rounded-2xl border border-black/10 bg-white/90 px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--color-brand-contrast)] focus:ring-2 focus:ring-[var(--color-brand-contrast-muted)]"
            >
              <option value="campus">Campus</option>
              <option value="residential">Residential</option>
              <option value="coworking">Coworking</option>
            </select>
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
          <label className="text-sm font-medium text-[var(--text-primary)]">
            Access method
            <select
              value={accessMethod}
              onChange={(event) =>
                setAccessMethod(
                  event.target
                    .value as ApiCommunityAdminCommunity['accessMethod'],
                )
              }
              className="mt-1.5 w-full rounded-2xl border border-black/10 bg-white/90 px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--color-brand-contrast)] focus:ring-2 focus:ring-[var(--color-brand-contrast-muted)]"
            >
              <option value="invite_code">Invite code</option>
              <option value="email_domain">Verified email domain</option>
            </select>
          </label>

          <label className="text-sm font-medium text-[var(--text-primary)]">
            Email domain
            <input
              value={emailDomain}
              onChange={(event) => setEmailDomain(event.target.value)}
              placeholder="wisc.edu"
              disabled={accessMethod !== 'email_domain'}
              className="mt-1.5 w-full rounded-2xl border border-black/10 bg-white/90 px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--color-brand-contrast)] focus:ring-2 focus:ring-[var(--color-brand-contrast-muted)] disabled:cursor-not-allowed disabled:bg-[var(--bg-secondary)] disabled:text-[var(--text-tertiary)]"
            />
            <span className="mt-1.5 block text-xs text-[var(--text-tertiary)]">
              Only required when members join through a verified email domain.
            </span>
          </label>
        </div>

        <label className="text-sm font-medium text-[var(--text-primary)]">
          Community guidance and rules
          <textarea
            value={rulesText}
            onChange={(event) => setRulesText(event.target.value)}
            rows={5}
            placeholder="One guideline per line, such as pickup expectations or community-specific rules."
            className="mt-1.5 w-full rounded-2xl border border-black/10 bg-white/90 px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--color-brand-contrast)] focus:ring-2 focus:ring-[var(--color-brand-contrast-muted)]"
          />
          <span className="mt-1.5 block text-xs text-[var(--text-tertiary)]">
            These appear on the community homepage. Keep each line short and
            actionable.
          </span>
        </label>

        {detailsError ? (
          <p
            className="rounded-2xl border border-[var(--color-brand-warm)] bg-[var(--color-brand-warm-soft)] px-3 py-2 text-sm text-[var(--color-brand-warm-strong)]"
            role="alert"
          >
            {detailsError}
          </p>
        ) : null}
        {detailsMessage ? (
          <p
            className="rounded-2xl border border-[var(--color-brand-accent-muted)] bg-[var(--color-brand-accent-soft)] px-3 py-2 text-sm text-[var(--color-brand-accent-strong)]"
            role="status"
          >
            {detailsMessage}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-[var(--text-tertiary)]">
            Invite code creation and member roles remain managed below.
          </p>
          <button
            type="submit"
            disabled={detailsMutation.isPending}
            className="app-action-primary w-full px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {detailsMutation.isPending ? 'Saving...' : 'Save details'}
          </button>
        </div>
      </form>
    </section>
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
              className="h-24 rounded-3xl border border-black/10 bg-white/90 shadow-[var(--shadow-app-card)]"
            />
          ))}
        </div>
        <div className="mt-6 h-96 rounded-3xl border border-black/10 bg-white/90 shadow-[var(--shadow-app-card)]" />
      </div>
    </main>
  );
}

export default function AdminCommunityPage() {
  const queryClient = useQueryClient();
  const { primaryCommunityId, refreshSession, setPrimaryCommunityId, userId } =
    useAuth();
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(
    () => readRequestedCommunityId(),
  );
  const [inviteCode, setInviteCode] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [expiresAtLocal, setExpiresAtLocal] = useState('');
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [memberError, setMemberError] = useState<string | null>(null);
  const [memberSearch, setMemberSearch] = useState(
    () => readRequestedMemberSearch(),
  );
  const [memberFilter, setMemberFilter] = useState<MemberFilter>('all');

  const adminQuery = useQuery({
    queryKey: ['community-admin'],
    queryFn: fetchCommunityAdmin,
  });

  const communities = useMemo(
    () => adminQuery.data?.communities ?? [],
    [adminQuery.data?.communities],
  );
  const adminCommunityIds = useMemo(
    () => new Set(communities.map((community) => community.id)),
    [communities],
  );
  const selectedCommunity =
    communities.find((community) => community.id === selectedCommunityId) ??
    communities.find((community) => community.id === primaryCommunityId) ??
    communities[0] ??
    null;
  const selectedManagementCommunityId = selectedCommunity?.id ?? null;

  useEffect(() => {
    if (selectedManagementCommunityId) {
      writeSelectedCommunityUrl(selectedManagementCommunityId);
    }
  }, [selectedManagementCommunityId]);

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
          className="rounded-3xl border border-[var(--color-brand-warm)] bg-[var(--color-brand-warm-soft)] p-6 text-[var(--color-brand-warm-strong)]"
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
  const selectedActiveMemberCount = activeMemberCount(selectedCommunity);
  const activeInviteCount = selectedCommunity.inviteCodes.filter(
    (invite) => inviteState(invite) === 'active',
  ).length;
  const canSwitchManagementCommunity = communities.length > 1;
  const memberSearchValue = memberSearch.trim().toLowerCase();
  const visibleMembers = selectedCommunity.members.filter(
    (member) =>
      memberMatchesFilter(member, memberFilter) &&
      (!memberSearchValue || memberSearchText(member).includes(memberSearchValue)),
  );
  const memberFilterCounts: Record<MemberFilter, number> = {
    all: selectedCommunity.members.length,
    active: selectedCommunity.members.filter(
      (member) => member.status === 'active',
    ).length,
    inactive: selectedCommunity.members.filter(
      (member) => member.status === 'inactive',
    ).length,
    admins: selectedCommunity.members.filter((member) => member.role === 'admin')
      .length,
    members: selectedCommunity.members.filter(
      (member) => member.role === 'member',
    ).length,
  };

  const selectManagementCommunity = (communityId: string) => {
    if (!adminCommunityIds.has(communityId)) return;
    setSelectedCommunityId(communityId);
    setPrimaryCommunityId(communityId);
    writeSelectedCommunityUrl(communityId);
    setFormError(null);
    setFormMessage(null);
    setMemberError(null);
    setMemberSearch('');
    setMemberFilter('all');
  };

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
    <main className="mx-auto max-w-6xl px-4 py-6 pb-10 sm:py-8">
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
            className="app-action-secondary flex-1 px-4 py-2 text-sm sm:flex-none"
          >
            Reports
          </Link>
          <button
            type="button"
            onClick={() => void adminQuery.refetch()}
            disabled={adminQuery.isFetching}
            className="app-action-secondary flex-1 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
          >
            {adminQuery.isFetching ? 'Refreshing' : 'Refresh'}
          </button>
        </div>
      </header>

      <section className="app-panel mt-5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              Management community
            </p>
            <h2 className="mt-1 text-xl font-semibold text-[var(--text-primary)]">
              {selectedCommunity.name}
            </h2>
            <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
              {canSwitchManagementCommunity
                ? 'Switch which community you are managing. The selected community controls the invites and members below.'
                : 'You are currently an active admin for one community.'}
            </p>
          </div>
          <Link
            href={`/communities/${selectedCommunity.id}`}
            className="app-action-secondary w-full px-4 py-2 text-sm sm:w-auto"
          >
            Open community home
          </Link>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <label className="block text-sm font-medium text-[var(--text-primary)]">
            Switch management community
            <select
              value={selectedCommunity.id}
              disabled={!canSwitchManagementCommunity}
              onChange={(event) =>
                selectManagementCommunity(event.target.value)
              }
              className="mt-1.5 w-full rounded-2xl border border-black/10 bg-white/90 px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--color-brand-contrast)] focus:ring-2 focus:ring-[var(--color-brand-contrast-muted)] disabled:cursor-not-allowed disabled:bg-[var(--bg-secondary)] disabled:text-[var(--text-tertiary)]"
            >
              {communities.map((community) => (
                <option key={community.id} value={community.id}>
                  {community.name}
                </option>
              ))}
            </select>
            <span className="mt-1.5 block text-xs text-[var(--text-tertiary)]">
              Showing {communities.length}{' '}
              {communities.length === 1
                ? 'admin community'
                : 'admin communities'}
              .
            </span>
          </label>

          <div
            className="grid gap-2 sm:grid-cols-2"
            aria-label="Admin community shortcuts"
          >
            {communities.map((community) => {
              const active = community.id === selectedCommunity.id;
              return (
                <button
                  key={community.id}
                  type="button"
                  onClick={() => selectManagementCommunity(community.id)}
                  aria-pressed={active}
                  className={`rounded-2xl border px-3 py-3 text-left transition ${
                    active
                      ? 'border-[var(--color-brand-accent-muted)] bg-[var(--color-brand-accent-soft)]'
                      : 'border-black/10 bg-white/80 hover:bg-[var(--color-brand-primary-soft)]'
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-[var(--text-primary)]">
                      {community.name}
                    </span>
                    {active ? (
                      <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-brand-accent-strong)]">
                        Managing
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-1 block text-xs text-[var(--text-secondary)]">
                    {communityTypeLabel(community.type)} ·{' '}
                    {accessMethodLabel(community)}
                  </span>
                  <span className="mt-1 block text-xs text-[var(--text-tertiary)]">
                    {activeMemberCount(community)} active members ·{' '}
                    {community.inviteCodes.length} invite codes
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <CommunityDetailsForm
        key={selectedCommunity.id}
        community={selectedCommunity}
        onSaved={async () => {
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['community-admin'] }),
            queryClient.invalidateQueries({ queryKey: ['community-detail'] }),
            queryClient.invalidateQueries({ queryKey: ['me'] }),
            refreshSession(selectedCommunity.id),
          ]);
        }}
      />

      <section className="mt-5 grid gap-3 sm:grid-cols-3">
        <MetricCard label="Members" value={String(memberCount)}>
          {selectedActiveMemberCount} active
        </MetricCard>
        <MetricCard label="Admins" value={String(activeAdminCount)}>
          Last-admin protection enabled
        </MetricCard>
        <MetricCard label="Invites" value={String(activeInviteCount)}>
          {selectedCommunity.inviteCodes.length} total codes
        </MetricCard>
      </section>

      <section className="mt-6 grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="app-panel p-5">
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
                className="mt-1.5 w-full rounded-2xl border border-black/10 bg-white/90 px-3 py-2.5 font-mono text-sm uppercase tracking-wider text-[var(--text-primary)] outline-none focus:border-[var(--color-brand-contrast)] focus:ring-2 focus:ring-[var(--color-brand-contrast-muted)]"
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
                  className="mt-1.5 w-full rounded-2xl border border-black/10 bg-white/90 px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--color-brand-contrast)] focus:ring-2 focus:ring-[var(--color-brand-contrast-muted)]"
                />
              </label>
              <label className="text-sm font-medium text-[var(--text-primary)]">
                Expires
                <input
                  type="datetime-local"
                  value={expiresAtLocal}
                  onChange={(event) => setExpiresAtLocal(event.target.value)}
                  className="mt-1.5 w-full rounded-2xl border border-black/10 bg-white/90 px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--color-brand-contrast)] focus:ring-2 focus:ring-[var(--color-brand-contrast-muted)]"
                />
              </label>
            </div>

            {formError ? (
              <p
                className="rounded-2xl border border-[var(--color-brand-warm)] bg-[var(--color-brand-warm-soft)] px-3 py-2 text-sm text-[var(--color-brand-warm-strong)]"
                role="alert"
              >
                {formError}
              </p>
            ) : null}
            {formMessage ? (
              <p
                className="rounded-2xl border border-[var(--color-brand-accent-muted)] bg-[var(--color-brand-accent-soft)] px-3 py-2 text-sm text-[var(--color-brand-accent-strong)]"
                role="status"
              >
                {formMessage}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={inviteMutation.isPending}
              className="app-action-primary px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              {inviteMutation.isPending ? 'Creating...' : 'Create invite'}
            </button>
          </form>

          <div className="mt-5 space-y-2">
            {selectedCommunity.inviteCodes.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--bg-secondary)] px-4 py-5 text-center text-sm text-[var(--text-secondary)]">
                No invite codes yet.
              </p>
            ) : (
              selectedCommunity.inviteCodes.map((invite) => {
                const state = inviteState(invite);
                return (
                  <article
                    key={invite.id}
                    className="rounded-2xl border border-black/10 bg-[var(--bg-secondary)] p-3"
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

        <div className="app-panel p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Members
              </h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Search, filter, promote admins, or update member access.
              </p>
            </div>
            <span className="rounded-full bg-[var(--bg-secondary)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
              Showing {visibleMembers.length} of {memberCount}
            </span>
          </div>

          <div className="mt-4 grid gap-3">
            <label className="text-sm font-medium text-[var(--text-primary)]">
              Search members
              <input
                value={memberSearch}
                onChange={(event) => setMemberSearch(event.target.value)}
                placeholder="Name, email, phone, role, or status"
                className="mt-1.5 w-full rounded-2xl border border-black/10 bg-white/90 px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--color-brand-contrast)] focus:ring-2 focus:ring-[var(--color-brand-contrast-muted)]"
              />
            </label>

            <div className="flex flex-wrap gap-2" aria-label="Member filters">
              {MEMBER_FILTER_OPTIONS.map((option) => {
                const active = memberFilter === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setMemberFilter(option.id)}
                    aria-pressed={active}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      active
                        ? 'border-[var(--color-brand-contrast-muted)] bg-[var(--color-brand-contrast-soft)] text-[var(--color-brand-contrast)]'
                        : 'border-black/10 bg-white/80 text-[var(--text-secondary)] hover:bg-[var(--color-brand-primary-soft)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {option.label}{' '}
                    <span className="font-mono">
                      {memberFilterCounts[option.id]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {memberError ? (
            <p
              className="mt-4 rounded-2xl border border-[var(--color-brand-warm)] bg-[var(--color-brand-warm-soft)] px-3 py-2 text-sm text-[var(--color-brand-warm-strong)]"
              role="alert"
            >
              {memberError}
            </p>
          ) : null}

          <div className="mt-4 space-y-3">
            {visibleMembers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--bg-secondary)] px-4 py-6 text-center">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  No members match these filters
                </h3>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Try a different search term or filter to find community
                  members.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setMemberSearch('');
                    setMemberFilter('all');
                  }}
                  className="mt-3 text-sm font-semibold text-[var(--color-brand-contrast)] hover:underline"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              visibleMembers.map((member) => {
              const isPending =
                memberMutation.isPending && pendingUserId === member.userId;
              const memberIsLastActiveAdmin =
                member.role === 'admin' &&
                member.status === 'active' &&
                activeAdminCount <= 1;
              return (
                <article
                  key={member.userId}
                  className="rounded-2xl border border-black/10 bg-[var(--bg-secondary)] p-4"
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
                          className="flex-1 rounded-full border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] shadow-sm hover:bg-white hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
                        >
                          Demote to member
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() =>
                            runMemberUpdate(member, { role: 'admin' })
                          }
                          className="flex-1 rounded-full border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-[var(--text-primary)] shadow-sm hover:bg-[var(--color-brand-primary-soft)] disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
                        >
                          Promote to admin
                        </button>
                      )}

                      {member.status === 'active' ? (
                        <button
                          type="button"
                          disabled={isPending || memberIsLastActiveAdmin}
                          onClick={() =>
                            runMemberUpdate(member, { status: 'inactive' })
                          }
                          className="flex-1 rounded-full border border-[var(--color-brand-warm)] bg-white px-3 py-2 text-xs font-semibold text-[var(--color-brand-warm-strong)] shadow-sm hover:bg-[var(--color-brand-warm-soft)] disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
                        >
                          Deactivate access
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() =>
                            runMemberUpdate(member, { status: 'active' })
                          }
                          className="flex-1 rounded-full bg-[#111111] px-3 py-2 text-xs font-semibold text-[var(--color-brand-primary)] shadow-sm hover:bg-black disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
                        >
                          Reactivate access
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
              })
            )}
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
    <article className="rounded-3xl border border-black/10 bg-white/90 p-4 shadow-[var(--shadow-app-card)]">
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
