'use client';

import Link from 'next/link';
import type { MouseEvent } from 'react';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@sellr/api-client';
import {
  formatNotification,
  formatNotificationTime,
  type NotificationCategory,
  type NotificationViewModel,
} from '@/lib/notification-format';
import {
  ACTIVITY_REFETCH_INTERVAL_MS,
  invalidateNotificationActivity,
  markAllNotificationsReadInCaches,
  markNotificationReadInCaches,
} from '@/lib/query-refresh';

type FilterValue = NotificationCategory | 'all' | 'unread';

const FILTERS: Array<{ value: FilterValue; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'messages', label: 'Messages' },
  { value: 'listings', label: 'Listings' },
  { value: 'marketplace', label: 'Marketplace' },
  { value: 'time-sensitive', label: 'Pickup changes' },
];

function categoryLabel(category: NotificationCategory): string {
  if (category === 'time-sensitive') return 'Pickup';
  return category[0].toUpperCase() + category.slice(1);
}

function categoryClass(category: NotificationCategory): string {
  if (category === 'messages') {
    return 'bg-[var(--color-brand-contrast-soft)] text-[var(--color-brand-contrast)]';
  }
  if (category === 'marketplace') {
    return 'bg-[var(--color-brand-primary-soft)] text-[var(--color-brand-primary-strong)]';
  }
  if (category === 'time-sensitive') {
    return 'bg-[var(--color-brand-warm-soft)] text-[var(--color-brand-warm-strong)]';
  }
  if (category === 'listings') {
    return 'bg-[var(--color-brand-accent-soft)] text-[var(--color-brand-accent-strong)]';
  }
  return 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]';
}

function NotificationSkeleton() {
  return (
    <section className="mt-4 space-y-3">
      {Array.from({ length: 4 }, (_, index) => (
        <div
          key={index}
          className="rounded-lg border border-[var(--border-default)] bg-white p-4 shadow-sm"
        >
          <div className="h-4 w-24 rounded bg-[var(--bg-tertiary)]" />
          <div className="mt-3 h-5 w-2/3 rounded bg-[var(--bg-tertiary)]" />
          <div className="mt-2 h-4 w-full rounded bg-[var(--bg-tertiary)]" />
        </div>
      ))}
    </section>
  );
}

function NotificationCard({
  notification,
  onMarkRead,
}: {
  notification: NotificationViewModel;
  onMarkRead: (notificationId: string) => void;
}) {
  const isPickup = notification.category === 'time-sensitive';
  const isUnread = !notification.read;
  const accentColor = isPickup
    ? 'var(--color-brand-warm)'
    : isUnread
      ? 'var(--color-brand-contrast)'
      : 'transparent';

  const handleMarkReadClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onMarkRead(notification.id);
  };

  const handleOpenClick = () => {
    if (isUnread) {
      onMarkRead(notification.id);
    }
  };

  return (
    <article
      className="group relative rounded-lg border border-[var(--border-default)] bg-white shadow-sm transition hover:border-[var(--color-brand-contrast-muted)] hover:shadow-md"
      style={{
        borderLeftColor: accentColor,
        borderLeftWidth: accentColor === 'transparent' ? '1px' : '4px',
      }}
    >
      <Link
        href={notification.href}
        onClick={handleOpenClick}
        className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 p-4 no-underline"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${categoryClass(
                notification.category,
              )}`}
            >
              {categoryLabel(notification.category)}
            </span>
            {isPickup ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-brand-warm-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-brand-warm-strong)]">
                <span
                  aria-hidden="true"
                  className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-brand-warm)]"
                />
                Time-sensitive
              </span>
            ) : null}
            <time className="text-xs text-[var(--text-tertiary)]">
              {formatNotificationTime(notification.sentAt)}
            </time>
          </div>
          <div className="mt-2 flex items-start gap-2">
            {isUnread ? (
              <span
                aria-label="Unread"
                className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full bg-[var(--color-brand-contrast)]"
              />
            ) : null}
            <h2
              className={`min-w-0 break-words text-base text-[var(--text-primary)] ${
                isUnread ? 'font-bold' : 'font-semibold'
              }`}
            >
              {notification.title}
            </h2>
          </div>
          <p
            className={`mt-1 line-clamp-2 break-words text-sm leading-6 ${
              isUnread
                ? 'text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)]'
            }`}
          >
            {notification.body}
          </p>
          {isUnread ? (
            <button
              type="button"
              onClick={handleMarkReadClick}
              className="mt-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold text-[var(--color-brand-contrast)] hover:bg-[var(--bg-secondary)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-contrast-muted)]"
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m5 12 5 5L20 7" />
              </svg>
              Mark read
            </button>
          ) : null}
        </div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mt-1 shrink-0 text-[var(--text-tertiary)] transition group-hover:translate-x-0.5 group-hover:text-[var(--color-brand-contrast)]"
          aria-hidden="true"
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
      </Link>
    </article>
  );
}

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterValue>('all');

  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: () => fetchNotifications({ limit: 50 }),
    refetchInterval: ACTIVITY_REFETCH_INTERVAL_MS,
  });

  const notifications = useMemo(
    () =>
      (notificationsQuery.data?.notifications ?? []).map((notification) =>
        formatNotification(notification),
      ),
    [notificationsQuery.data?.notifications],
  );

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  const filteredNotifications = useMemo(() => {
    if (filter === 'all') return notifications;
    if (filter === 'unread') return notifications.filter((n) => !n.read);
    return notifications.filter((n) => n.category === filter);
  }, [notifications, filter]);

  const filterCounts = useMemo(() => {
    const initial: Record<string, number> = { all: 0, unread: 0 };
    return notifications.reduce<Record<string, number>>(
      (counts, notification) => ({
        ...counts,
        [notification.category]: (counts[notification.category] ?? 0) + 1,
        unread: counts.unread + (notification.read ? 0 : 1),
        all: counts.all + 1,
      }),
      initial,
    );
  }, [notifications]);

  const summaryLine =
    notifications.length === 0
      ? 'No notifications yet'
      : unreadCount > 0
        ? `${unreadCount} unread of ${notifications.length}`
        : `All caught up · ${notifications.length} ${notifications.length === 1 ? 'notification' : 'notifications'}`;

  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: async (_result, notificationId) => {
      markNotificationReadInCaches(queryClient, notificationId);
      await invalidateNotificationActivity(queryClient);
    },
  });

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: async () => {
      markAllNotificationsReadInCaches(queryClient);
      await invalidateNotificationActivity(queryClient);
    },
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand-contrast)]">
            Activity
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">
            Notifications
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {summaryLine}
          </p>
        </div>
        <button
          type="button"
          disabled={unreadCount === 0 || markAllMutation.isPending}
          onClick={() => markAllMutation.mutate()}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-brand-contrast)] shadow-sm hover:bg-[var(--bg-secondary)] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {markAllMutation.isPending ? null : (
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
            >
              <path d="m4 12 4 4 12-12" />
              <path d="m12 12 4 4" />
            </svg>
          )}
          {markAllMutation.isPending ? 'Marking...' : 'Mark all read'}
        </button>
      </header>

      {notifications.length > 0 ? (
        <div
          className="mt-4 flex flex-wrap items-center gap-2"
          role="group"
          aria-label="Filter notifications"
        >
          {FILTERS.map((item) => {
            const active = filter === item.value;
            const count = filterCounts[item.value] ?? 0;
            const isUnread = item.value === 'unread';
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                aria-pressed={active}
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition"
                style={
                  active
                    ? {
                        background: isUnread
                          ? 'var(--color-brand-contrast)'
                          : 'var(--color-brand-primary)',
                        color: isUnread ? 'white' : 'var(--text-primary)',
                        borderColor: isUnread
                          ? 'var(--color-brand-contrast)'
                          : 'var(--color-brand-primary)',
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
                          color: isUnread ? 'white' : 'var(--text-primary)',
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
      ) : null}

      {notificationsQuery.isLoading ? <NotificationSkeleton /> : null}

      {notificationsQuery.isError ? (
        <section
          className="mt-6 rounded-lg border border-[var(--color-brand-warm)] bg-[var(--color-brand-warm-soft)] p-6 text-[var(--color-brand-warm-strong)]"
          role="alert"
        >
          <h2 className="text-base font-semibold">
            Could not load notifications
          </h2>
          <p className="mt-2 text-sm">
            {notificationsQuery.error instanceof Error
              ? notificationsQuery.error.message
              : 'Refresh and try again.'}
          </p>
          <button
            type="button"
            onClick={() => void notificationsQuery.refetch()}
            className="mt-4 w-full rounded-lg bg-[var(--color-brand-warm)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-brand-warm-strong)] sm:w-auto"
          >
            Retry
          </button>
        </section>
      ) : null}

      {!notificationsQuery.isLoading &&
      !notificationsQuery.isError &&
      notifications.length === 0 ? (
        <section className="mt-6 rounded-lg border border-dashed border-[var(--border-strong)] bg-white p-8 text-center">
          <h2 className="text-xl font-semibold">No notifications yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--text-secondary)]">
            Updates appear here after messages, marketplace posts, and listing
            changes affect your buyer or seller activity.
          </p>
          <Link
            href="/marketplace"
            className="mt-5 inline-flex rounded-lg bg-[var(--color-brand-primary)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] no-underline shadow-sm hover:bg-[var(--color-brand-primary-hover)]"
          >
            Browse marketplace
          </Link>
        </section>
      ) : null}

      {!notificationsQuery.isLoading &&
      !notificationsQuery.isError &&
      notifications.length > 0 &&
      filteredNotifications.length === 0 ? (
        <section className="mt-4 rounded-lg border border-dashed border-[var(--border-strong)] bg-white p-8 text-center">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            {filter === 'unread' ? 'You are caught up' : 'Nothing in this tab'}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--text-secondary)]">
            {filter === 'unread'
              ? 'No unread notifications right now.'
              : 'Try another tab or wait for a new marketplace update.'}
          </p>
          <button
            type="button"
            onClick={() => setFilter('all')}
            className="mt-4 inline-flex rounded-lg border border-[var(--border-strong)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-brand-contrast)] shadow-sm hover:bg-[var(--bg-secondary)]"
          >
            View all
          </button>
        </section>
      ) : null}

      {filteredNotifications.length > 0 ? (
        <section className="mt-4 space-y-2">
          {filteredNotifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onMarkRead={(notificationId) =>
                markReadMutation.mutate(notificationId)
              }
            />
          ))}
        </section>
      ) : null}
    </main>
  );
}
