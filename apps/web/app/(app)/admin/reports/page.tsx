'use client';

import { ApiError, fetchReports, updateReportStatus } from '@sellr/api-client';
import type { ApiReport, ApiReportStatus } from '@sellr/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useMemo, useState } from 'react';

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
  if (!value) return 'Not resolved';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function statusClass(status: ApiReportStatus) {
  if (status === 'open') {
    return 'border-[var(--color-brand-warm)] bg-[var(--color-brand-warm-soft)] text-[var(--color-brand-warm-strong)]';
  }
  if (status === 'in_review') {
    return 'border-[var(--color-brand-accent)] bg-[var(--color-brand-accent-soft)] text-[var(--color-brand-contrast)]';
  }
  return 'border-[var(--border-default)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)]';
}

function severityClass(severity: ApiReport['severity']) {
  return severity === 'safety'
    ? 'border-red-200 bg-red-50 text-red-700'
    : 'border-[var(--border-default)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)]';
}

function AdminRestricted({ message }: { message: string }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <section
        className="rounded-xl border border-[var(--border-default)] bg-white p-8 shadow-sm"
        role="alert"
      >
        <p className="text-sm font-medium text-[var(--color-brand-contrast)]">
          Admin
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--text-primary)]">
          Reports dashboard is restricted
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
          {message}
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex w-full justify-center rounded-lg bg-[var(--color-brand-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] shadow-sm hover:bg-[var(--color-brand-primary-hover)] sm:w-auto"
        >
          Back to dashboard
        </Link>
      </section>
    </main>
  );
}

function ReportSkeleton() {
  return (
    <section className="mt-6 space-y-3" aria-label="Loading reports">
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="animate-pulse rounded-xl border border-[var(--border-default)] bg-white p-5 shadow-sm"
        >
          <div className="h-4 w-40 rounded bg-[var(--bg-tertiary)]" />
          <div className="mt-4 h-5 w-3/4 rounded bg-[var(--bg-tertiary)]" />
          <div className="mt-3 h-4 w-full rounded bg-[var(--bg-tertiary)]" />
        </div>
      ))}
    </section>
  );
}

function ReportCard({
  report,
  onStatusChange,
  isUpdating,
}: {
  report: ApiReport;
  onStatusChange: (status: ApiReportStatus) => void;
  isUpdating: boolean;
}) {
  const actions: Array<{ status: ApiReportStatus; label: string }> = (
    [
    { status: 'in_review', label: 'Review' },
    { status: 'resolved', label: 'Resolve' },
    { status: 'dismissed', label: 'Dismiss' },
    { status: 'open', label: 'Reopen' },
    ] satisfies Array<{ status: ApiReportStatus; label: string }>
  ).filter((action) => action.status !== report.status);

  return (
    <article className="rounded-xl border border-[var(--border-default)] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${statusClass(report.status)}`}
            >
              {statusLabel(report.status)}
            </span>
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${severityClass(report.severity)}`}
            >
              {report.severity}
            </span>
            <span className="rounded-full border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2.5 py-1 text-xs font-semibold capitalize text-[var(--text-secondary)]">
              {report.targetType}
            </span>
          </div>
          <h2 className="mt-3 break-words text-lg font-semibold text-[var(--text-primary)]">
            {report.target?.label ?? 'Reported item unavailable'}
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {report.target?.detail ?? 'The target may have been removed.'}
          </p>
        </div>
        <p className="text-sm text-[var(--text-tertiary)]">
          {formatDate(report.createdAt)}
        </p>
      </div>

      <div className="mt-4 rounded-lg bg-[var(--bg-secondary)] p-4">
        <p className="text-sm font-medium text-[var(--text-primary)]">
          Report reason
        </p>
        <p className="mt-2 break-words text-sm leading-6 text-[var(--text-secondary)]">
          {report.reason}
        </p>
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-[var(--text-tertiary)]">Reporter</dt>
          <dd className="mt-1 font-medium text-[var(--text-primary)]">
            {report.reporter.displayName}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--text-tertiary)]">Reporter phone</dt>
          <dd className="mt-1 font-medium text-[var(--text-primary)]">
            {report.reporter.phoneE164}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--text-tertiary)]">Resolved</dt>
          <dd className="mt-1 font-medium text-[var(--text-primary)]">
            {formatDate(report.resolvedAt)}
          </dd>
        </div>
      </dl>

      <div className="mt-5 flex flex-wrap gap-2">
        {report.target?.href ? (
          <Link
            href={report.target.href}
            className="inline-flex w-full justify-center rounded-lg border border-[var(--border-strong)] bg-white px-3 py-2 text-sm font-medium text-[var(--color-brand-contrast)] hover:bg-[var(--bg-tertiary)] sm:w-auto"
          >
            View target
          </Link>
        ) : null}
        {actions.map((action) => (
          <button
            key={action.status}
            type="button"
            disabled={isUpdating}
            onClick={() => onStatusChange(action.status)}
            className="w-full rounded-lg bg-[var(--color-brand-primary)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)] shadow-sm hover:bg-[var(--color-brand-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {isUpdating ? 'Saving...' : action.label}
          </button>
        ))}
      </div>
    </article>
  );
}

export default function AdminReportsPage() {
  const [status, setStatus] = useState<StatusFilter>('open');
  const [severity, setSeverity] = useState<SeverityFilter>('all');
  const [targetType, setTargetType] = useState<TargetTypeFilter>('all');
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

  const reports = useMemo(
    () => reportsQuery.data?.reports ?? [],
    [reportsQuery.data?.reports],
  );
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
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[var(--color-brand-contrast)]">
            Admin
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-[var(--text-primary)]">
            Reports dashboard
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            Review community reports, inspect the reported listing or message,
            and move each report through a lightweight moderation status.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void reportsQuery.refetch()}
          className="w-full rounded-lg border border-[var(--border-strong)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--color-brand-contrast)] shadow-sm hover:bg-[var(--bg-tertiary)] sm:w-auto"
        >
          Refresh
        </button>
      </div>

      <section className="mt-6 rounded-xl border border-[var(--border-default)] bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((item) => {
              const active = status === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setStatus(item.value)}
                  aria-pressed={active}
                  className="rounded-lg border px-3 py-2 text-sm font-medium transition"
                  style={{
                    borderColor: active
                      ? 'var(--color-brand-primary)'
                      : 'var(--border-default)',
                    background: active
                      ? 'var(--color-brand-primary-soft)'
                      : 'var(--bg-elevated)',
                    color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <select
            value={severity}
            onChange={(event) =>
              setSeverity(event.currentTarget.value as SeverityFilter)
            }
            className="rounded-lg border border-[var(--border-default)] bg-white px-3 py-2 text-sm text-[var(--text-primary)]"
          >
            {SEVERITY_FILTERS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <select
            value={targetType}
            onChange={(event) =>
              setTargetType(event.currentTarget.value as TargetTypeFilter)
            }
            className="rounded-lg border border-[var(--border-default)] bg-white px-3 py-2 text-sm text-[var(--text-primary)]"
          >
            {TARGET_FILTERS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {reportsQuery.isLoading ? <ReportSkeleton /> : null}

      {reportsQuery.isError &&
      !(reportsQuery.error instanceof ApiError && reportsQuery.error.status === 403) ? (
        <section
          className="mt-6 rounded-lg border border-[var(--color-brand-warm)] bg-[var(--color-brand-warm-soft)] p-6 text-[var(--color-brand-warm-strong)]"
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
      reports.length === 0 ? (
        <section className="mt-6 rounded-lg border border-dashed border-[var(--border-strong)] bg-white p-8 text-center">
          <h2 className="text-xl font-semibold">No reports found</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--text-secondary)]">
            New listing, message, and member reports for your admin communities
            will appear here.
          </p>
        </section>
      ) : null}

      {reports.length > 0 ? (
        <section className="mt-6 space-y-3">
          {reports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              isUpdating={updateMutation.isPending}
              onStatusChange={(nextStatus) =>
                updateMutation.mutate({ reportId: report.id, nextStatus })
              }
            />
          ))}
        </section>
      ) : null}
    </main>
  );
}
