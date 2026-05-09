'use client';

import {
  ApiError,
  fetchReports,
  removeReportedListing,
  updateReportStatus,
} from '@sellr/api-client';
import type { ApiReport, ApiReportStatus } from '@sellr/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type StatusFilter = ApiReportStatus | 'all';
type SeverityFilter = 'safety' | 'quality' | 'all';
type TargetTypeFilter = 'listing' | 'user' | 'message' | 'all';

const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'open', label: 'Open' },
  { value: 'in_review', label: 'In review' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'dismissed', label: 'Dismissed' },
  { value: 'all', label: 'All' },
];

const SEVERITY_FILTERS: Array<{ value: SeverityFilter; label: string }> = [
  { value: 'all', label: 'All severity' },
  { value: 'safety', label: 'Safety' },
  { value: 'quality', label: 'Quality' },
];

const TARGET_FILTERS: Array<{ value: TargetTypeFilter; label: string }> = [
  { value: 'all', label: 'All targets' },
  { value: 'listing', label: 'Listings' },
  { value: 'message', label: 'Messages' },
  { value: 'user', label: 'Members' },
];

function statusLabel(status: ApiReportStatus) {
  return status.replace('_', ' ');
}

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function statusToneStyle(status: ApiReportStatus): {
  background: string;
  color: string;
} {
  if (status === 'open') {
    return {
      background: 'var(--color-brand-warm-soft)',
      color: 'var(--color-brand-warm-strong)',
    };
  }
  if (status === 'in_review') {
    return {
      background: 'var(--color-brand-contrast-soft)',
      color: 'var(--color-brand-contrast)',
    };
  }
  if (status === 'resolved') {
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

function severityToneStyle(severity: ApiReport['severity']): {
  background: string;
  color: string;
} {
  if (severity === 'safety') {
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

function AdminRestricted({ message }: { message: string }) {
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
          Reports dashboard is restricted
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
          {message}
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

function ReportSkeleton() {
  return (
    <section className="mt-4 space-y-3" aria-label="Loading reports">
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="animate-pulse rounded-lg border border-[var(--border-default)] bg-white p-5 shadow-sm"
        >
          <div className="h-4 w-40 rounded bg-[var(--bg-tertiary)]" />
          <div className="mt-4 h-5 w-3/4 rounded bg-[var(--bg-tertiary)]" />
          <div className="mt-3 h-4 w-full rounded bg-[var(--bg-tertiary)]" />
        </div>
      ))}
    </section>
  );
}

type StatusAction = { status: ApiReportStatus; label: string };

function actionsForStatus(status: ApiReportStatus): {
  primary: StatusAction | null;
  secondary: StatusAction[];
} {
  if (status === 'open') {
    return {
      primary: { status: 'in_review', label: 'Move to review' },
      secondary: [
        { status: 'resolved', label: 'Resolve' },
        { status: 'dismissed', label: 'Dismiss' },
      ],
    };
  }
  if (status === 'in_review') {
    return {
      primary: { status: 'resolved', label: 'Resolve' },
      secondary: [
        { status: 'dismissed', label: 'Dismiss' },
        { status: 'open', label: 'Reopen' },
      ],
    };
  }
  return {
    primary: null,
    secondary: [{ status: 'open', label: 'Reopen' }],
  };
}

function ReportCard({
  report,
  onStatusChange,
  onRemoveListing,
  isUpdating,
  isRemoving,
  pendingStatus,
  selected,
  onSelectChange,
  bulkBusy,
}: {
  report: ApiReport;
  onStatusChange: (status: ApiReportStatus) => void;
  onRemoveListing: () => void;
  isUpdating: boolean;
  isRemoving: boolean;
  pendingStatus: ApiReportStatus | null;
  selected: boolean;
  onSelectChange: (next: boolean) => void;
  bulkBusy: boolean;
}) {
  const { primary, secondary } = actionsForStatus(report.status);
  const statusStyle = statusToneStyle(report.status);
  const severityStyle = severityToneStyle(report.severity);

  return (
    <article className="rounded-lg border border-[var(--border-default)] bg-white p-5 shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="checkbox"
            aria-label={`Select report ${report.id}`}
            checked={selected}
            disabled={bulkBusy}
            onChange={(event) => onSelectChange(event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-[var(--border-strong)] text-[var(--color-brand-contrast)] focus:ring-[var(--color-brand-contrast)] disabled:cursor-not-allowed"
          />
          <span
            className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide"
            style={statusStyle}
          >
            {statusLabel(report.status)}
          </span>
          <span
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide"
            style={severityStyle}
          >
            {report.severity === 'safety' ? (
              <span
                aria-hidden="true"
                className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-brand-warm)]"
              />
            ) : null}
            {report.severity}
          </span>
          <span className="inline-flex items-center rounded-full bg-[var(--bg-secondary)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
            {report.targetType}
          </span>
        </div>
        <p className="text-xs text-[var(--text-tertiary)]">
          {formatDate(report.createdAt)}
        </p>
      </header>

      <h2 className="mt-3 break-words text-base font-semibold text-[var(--text-primary)] sm:text-lg">
        {report.target?.label ?? 'Reported item unavailable'}
      </h2>
      <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
        {report.target?.detail ?? 'The target may have been removed.'}
      </p>

      <div className="mt-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
          Report reason
        </p>
        <p className="mt-1.5 break-words text-sm leading-6 text-[var(--text-primary)]">
          {report.reason}
        </p>
      </div>

      <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--text-tertiary)]">
        <span>
          Reported by{' '}
          <span className="font-medium text-[var(--text-primary)]">
            {report.reporter.displayName}
          </span>
        </span>
        <span>
          ·{' '}
          <span className="font-mono">{report.reporter.phoneE164}</span>
        </span>
        <span>· Resolved {formatDate(report.resolvedAt)}</span>
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {primary ? (
          <button
            type="button"
            disabled={isUpdating}
            onClick={() => onStatusChange(primary.status)}
            className="rounded-lg bg-[var(--color-brand-primary)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)] shadow-sm transition hover:bg-[var(--color-brand-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isUpdating && pendingStatus === primary.status
              ? 'Saving...'
              : primary.label}
          </button>
        ) : null}
        {secondary.map((action) => (
          <button
            key={action.status}
            type="button"
            disabled={isUpdating}
            onClick={() => onStatusChange(action.status)}
            className="rounded-lg border border-[var(--border-default)] bg-white px-3 py-2 text-sm font-medium text-[var(--text-secondary)] shadow-sm transition hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isUpdating && pendingStatus === action.status
              ? 'Saving...'
              : action.label}
          </button>
        ))}
        {report.targetType === 'listing' && report.target ? (
          <button
            type="button"
            disabled={isUpdating || isRemoving}
            onClick={onRemoveListing}
            className="rounded-lg border border-[var(--color-brand-warm)] bg-white px-3 py-2 text-sm font-semibold text-[var(--color-brand-warm-strong)] shadow-sm transition hover:bg-[var(--color-brand-warm-soft)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isRemoving ? 'Removing...' : 'Remove listing'}
          </button>
        ) : null}
        {report.target?.href ? (
          <Link
            href={report.target.href}
            target="_blank"
            rel="noreferrer"
            className="ml-auto inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-[var(--color-brand-contrast)] no-underline hover:bg-[var(--bg-secondary)] hover:underline"
          >
            View target
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M7 7h10v10" />
              <path d="M7 17 17 7" />
            </svg>
          </Link>
        ) : null}
      </div>
    </article>
  );
}

export default function AdminReportsPage() {
  const [status, setStatus] = useState<StatusFilter>('open');
  const [severity, setSeverity] = useState<SeverityFilter>('all');
  const [targetType, setTargetType] = useState<TargetTypeFilter>('all');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkPending, setBulkPending] = useState<ApiReportStatus | null>(null);
  const queryClient = useQueryClient();

  const reportsQuery = useQuery({
    queryKey: ['admin-reports', status, severity, targetType],
    queryFn: () => fetchReports({ status, severity, targetType, limit: 100 }),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      reportId,
      nextStatus,
    }: {
      reportId: string;
      nextStatus: ApiReportStatus;
    }) => updateReportStatus(reportId, nextStatus),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
    },
  });

  const removeListingMutation = useMutation({
    mutationFn: ({ reportId }: { reportId: string }) =>
      removeReportedListing(reportId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
    },
  });

  const reports = useMemo(
    () => reportsQuery.data?.reports ?? [],
    [reportsQuery.data?.reports],
  );

  const filteredReports = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (needle.length === 0) return reports;
    return reports.filter((report) => {
      if (report.reason.toLowerCase().includes(needle)) return true;
      if (report.reporter.displayName.toLowerCase().includes(needle))
        return true;
      if (report.reporter.phoneE164.toLowerCase().includes(needle))
        return true;
      if (report.target?.label.toLowerCase().includes(needle)) return true;
      return false;
    });
  }, [reports, search]);

  // Drop selections that are no longer visible (filter changed, query
  // reloaded, or search trimmed away the row).
  useEffect(() => {
    const visibleIds = new Set(filteredReports.map((r) => r.id));
    setSelectedIds((current) => {
      let changed = false;
      const next = new Set<string>();
      current.forEach((id) => {
        if (visibleIds.has(id)) {
          next.add(id);
        } else {
          changed = true;
        }
      });
      return changed ? next : current;
    });
  }, [filteredReports]);

  const statusCounts = useMemo(() => {
    return reports.reduce<Record<string, number>>(
      (counts, report) => ({
        ...counts,
        [report.status]: (counts[report.status] ?? 0) + 1,
        all: (counts.all ?? 0) + 1,
      }),
      {},
    );
  }, [reports]);

  const summaryLine = useMemo(() => {
    if (filteredReports.length === 0) {
      return search.trim().length > 0
        ? 'No reports match this search.'
        : 'No reports in this view.';
    }
    const open = statusCounts['open'] ?? 0;
    const inReview = statusCounts['in_review'] ?? 0;
    const resolved = statusCounts['resolved'] ?? 0;
    const dismissed = statusCounts['dismissed'] ?? 0;
    const parts: string[] = [];
    if (open > 0) parts.push(`${open} open`);
    if (inReview > 0) parts.push(`${inReview} in review`);
    if (resolved > 0) parts.push(`${resolved} resolved`);
    if (dismissed > 0) parts.push(`${dismissed} dismissed`);
    if (search.trim().length > 0) {
      parts.unshift(
        `${filteredReports.length} matching ${filteredReports.length === 1 ? 'report' : 'reports'}`,
      );
    }
    return parts.length > 0
      ? parts.join(' · ')
      : `${reports.length} ${reports.length === 1 ? 'report' : 'reports'}`;
  }, [filteredReports.length, reports.length, search, statusCounts]);

  const pendingStatusForId = (reportId: string): ApiReportStatus | null => {
    if (!updateMutation.isPending) return null;
    const variables = updateMutation.variables;
    if (!variables) return null;
    return variables.reportId === reportId ? variables.nextStatus : null;
  };

  const toggleSelected = (reportId: string, next: boolean) => {
    setSelectedIds((current) => {
      const updated = new Set(current);
      if (next) updated.add(reportId);
      else updated.delete(reportId);
      return updated;
    });
  };

  const allVisibleSelected =
    filteredReports.length > 0 &&
    filteredReports.every((report) => selectedIds.has(report.id));
  const someVisibleSelected =
    !allVisibleSelected &&
    filteredReports.some((report) => selectedIds.has(report.id));

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredReports.map((report) => report.id)));
    }
  };

  const runBulkUpdate = async (nextStatus: ApiReportStatus) => {
    const ids = filteredReports
      .filter(
        (report) =>
          selectedIds.has(report.id) && report.status !== nextStatus,
      )
      .map((report) => report.id);
    if (ids.length === 0) return;
    setBulkPending(nextStatus);
    try {
      await Promise.allSettled(
        ids.map((reportId) => updateReportStatus(reportId, nextStatus)),
      );
    } finally {
      setBulkPending(null);
      setSelectedIds(new Set());
      await queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
    }
  };

  const selectedCount = selectedIds.size;
  const isBulkBusy = bulkPending !== null;

  if (
    reportsQuery.isError &&
    reportsQuery.error instanceof ApiError &&
    reportsQuery.error.status === 403
  ) {
    return (
      <AdminRestricted message="Your current account is authenticated, but it does not have an active admin role in this community." />
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand-contrast)]">
            Admin
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">
            Reports dashboard
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {summaryLine}
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <Link
            href="/admin/community"
            className="inline-flex flex-1 justify-center rounded-lg border border-[var(--border-default)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-brand-contrast)] no-underline shadow-sm hover:bg-[var(--bg-secondary)] sm:flex-none"
          >
            Community setup
          </Link>
          <button
            type="button"
            onClick={() => void reportsQuery.refetch()}
            disabled={reportsQuery.isFetching}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-brand-contrast)] shadow-sm hover:bg-[var(--bg-secondary)] disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className={reportsQuery.isFetching ? 'animate-spin' : ''}
            >
              <path d="M21 12a9 9 0 0 0-15.5-6.4L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 15.5 6.4L21 16" />
              <path d="M21 21v-5h-5" />
            </svg>
            {reportsQuery.isFetching ? 'Refreshing' : 'Refresh'}
          </button>
        </div>
      </header>

      <div className="mt-4 space-y-2">
        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label="Filter reports by status"
        >
          {STATUS_FILTERS.map((item) => {
            const active = status === item.value;
            const count =
              item.value === 'all'
                ? statusCounts['all'] ?? 0
                : statusCounts[item.value] ?? 0;
            const isOpen = item.value === 'open';
            const isReview = item.value === 'in_review';
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setStatus(item.value)}
                aria-pressed={active}
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition"
                style={
                  active
                    ? isOpen
                      ? {
                          background: 'var(--color-brand-warm)',
                          color: 'white',
                          borderColor: 'var(--color-brand-warm)',
                        }
                      : isReview
                        ? {
                            background: 'var(--color-brand-contrast)',
                            color: 'white',
                            borderColor: 'var(--color-brand-contrast)',
                          }
                        : {
                            background: 'var(--color-brand-primary)',
                            color: 'var(--text-primary)',
                            borderColor: 'var(--color-brand-primary)',
                          }
                    : {
                        background: 'white',
                        color: 'var(--text-secondary)',
                        borderColor: 'var(--border-default)',
                      }
                }
              >
                <span>{item.label}</span>
                <span
                  className="inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold"
                  style={
                    active
                      ? {
                          background: 'rgba(255,255,255,0.25)',
                          color: isOpen || isReview ? 'white' : 'var(--text-primary)',
                        }
                      : {
                          background: 'var(--bg-tertiary)',
                          color: 'var(--text-tertiary)',
                        }
                  }
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label="Filter by severity and target"
        >
          <FilterPill
            label="Severity"
            options={SEVERITY_FILTERS}
            value={severity}
            onChange={(next) => setSeverity(next)}
          />
          <FilterPill
            label="Target"
            options={TARGET_FILTERS}
            value={targetType}
            onChange={(next) => setTargetType(next)}
          />
          <label className="ml-auto inline-flex w-full items-center gap-2 rounded-full border border-[var(--border-default)] bg-white px-3 py-1.5 text-xs sm:w-auto sm:min-w-[260px]">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
              Search
            </span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Reason, reporter, or target"
              className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none"
              aria-label="Search reports"
            />
            {search.length > 0 ? (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Clear search"
                className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-[var(--text-tertiary)] hover:bg-[var(--bg-secondary)]"
              >
                Clear
              </button>
            ) : null}
          </label>
        </div>

        {filteredReports.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border-default)] bg-white px-3 py-2 text-xs">
            <label className="inline-flex items-center gap-2 text-[var(--text-secondary)]">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                ref={(node) => {
                  if (node) node.indeterminate = someVisibleSelected;
                }}
                disabled={isBulkBusy}
                onChange={toggleSelectAllVisible}
                aria-label={
                  allVisibleSelected
                    ? 'Clear selection'
                    : 'Select all visible reports'
                }
                className="h-4 w-4 rounded border-[var(--border-strong)] text-[var(--color-brand-contrast)] focus:ring-[var(--color-brand-contrast)] disabled:cursor-not-allowed"
              />
              <span>
                {selectedCount > 0
                  ? `${selectedCount} selected`
                  : 'Select reports for bulk action'}
              </span>
            </label>
            <div className="ml-auto flex flex-wrap gap-2">
              <button
                type="button"
                disabled={selectedCount === 0 || isBulkBusy}
                onClick={() => void runBulkUpdate('resolved')}
                className="rounded-lg bg-[var(--color-brand-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] shadow-sm transition hover:bg-[var(--color-brand-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {bulkPending === 'resolved'
                  ? 'Resolving…'
                  : `Resolve${selectedCount > 0 ? ` ${String(selectedCount)}` : ''}`}
              </button>
              <button
                type="button"
                disabled={selectedCount === 0 || isBulkBusy}
                onClick={() => void runBulkUpdate('dismissed')}
                className="rounded-lg border border-[var(--border-default)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] shadow-sm transition hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {bulkPending === 'dismissed'
                  ? 'Dismissing…'
                  : `Dismiss${selectedCount > 0 ? ` ${String(selectedCount)}` : ''}`}
              </button>
              <button
                type="button"
                disabled={selectedCount === 0 || isBulkBusy}
                onClick={() => void runBulkUpdate('in_review')}
                className="rounded-lg border border-[var(--border-default)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] shadow-sm transition hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {bulkPending === 'in_review'
                  ? 'Moving…'
                  : 'Move to review'}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {reportsQuery.isLoading ? <ReportSkeleton /> : null}

      {reportsQuery.isError &&
      !(reportsQuery.error instanceof ApiError && reportsQuery.error.status === 403) ? (
        <section
          className="mt-4 rounded-lg border border-[var(--color-brand-warm)] bg-[var(--color-brand-warm-soft)] p-6 text-[var(--color-brand-warm-strong)]"
          role="alert"
        >
          <h2 className="text-base font-semibold">Could not load reports</h2>
          <p className="mt-2 text-sm">
            {reportsQuery.error instanceof Error
              ? reportsQuery.error.message
              : 'Refresh and try again.'}
          </p>
        </section>
      ) : null}

      {!reportsQuery.isLoading &&
      !reportsQuery.isError &&
      filteredReports.length === 0 ? (
        <section className="mt-4 rounded-lg border border-dashed border-[var(--border-strong)] bg-white p-8 text-center">
          <h2 className="text-xl font-semibold">
            {search.trim().length > 0
              ? 'No reports match this search'
              : 'No reports in this view'}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--text-secondary)]">
            {search.trim().length > 0
              ? 'Try clearing the search or widening the status / severity filters.'
              : 'New listing, message, and member reports for your admin communities will appear here.'}
          </p>
        </section>
      ) : null}

      {filteredReports.length > 0 ? (
        <section className="mt-4 space-y-3">
          {filteredReports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              isUpdating={
                updateMutation.isPending &&
                updateMutation.variables?.reportId === report.id
              }
              isRemoving={
                removeListingMutation.isPending &&
                removeListingMutation.variables?.reportId === report.id
              }
              pendingStatus={pendingStatusForId(report.id)}
              onStatusChange={(nextStatus) =>
                updateMutation.mutate({ reportId: report.id, nextStatus })
              }
              onRemoveListing={() => {
                if (
                  window.confirm(
                    'Remove this listing from the marketplace and delete its listing images?',
                  )
                ) {
                  removeListingMutation.mutate({ reportId: report.id });
                }
              }}
              selected={selectedIds.has(report.id)}
              onSelectChange={(next) => toggleSelected(report.id, next)}
              bulkBusy={isBulkBusy}
            />
          ))}
        </section>
      ) : null}
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* Filter pill (segmented chip group used for severity + target type)          */
/* -------------------------------------------------------------------------- */

function FilterPill<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-default)] bg-white p-0.5">
      <span className="px-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
        {label}
      </span>
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={active}
            className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium transition"
            style={
              active
                ? {
                    background: 'var(--color-brand-primary-soft)',
                    color: 'var(--color-brand-primary-strong)',
                  }
                : {
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                  }
            }
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
