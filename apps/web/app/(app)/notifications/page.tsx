'use client';

import Link from 'next/link';
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

const FILTERS: Array<{
  value: NotificationCategory | 'all' | 'unread';
  label: string;
}> = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'messages', label: 'Messages' },
  { value: 'listings', label: 'Listings' },
  { value: 'marketplace', label: 'Marketplace' },
  { value: 'time-sensitive', label: 'Pickup changes' },
];

function categoryLabel(category: NotificationCategory): string {
  if (category === 'time-sensitive') {
    return 'Pickup';
  }
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
    <section className="mt-6 space-y-3">
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
  return (
    <article
      className="rounded-lg border bg-white p-4 shadow-sm transition hover:border-[var(--color-brand-contrast-muted)]"
      style={{
        borderColor: notification.read
          ? 'var(--border-default)'
          : 'var(--color-brand-primary-muted)',
        background: notification.read
          ? 'var(--bg-elevated)'
          : 'var(--color-brand-primary-soft)',
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {!notification.read ? (
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-brand-primary)]" />
            ) : null}
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${categoryClass(
                notification.category,
              )}`}
            >
              {categoryLabel(notification.category)}
            </span>
            <time className="text-xs text-[var(--text-tertiary)]">
              {formatNotificationTime(notification.sentAt)}
            </time>
          </div>
          <h2 className="mt-3 text-base font-semibold text-[var(--text-primary)]">
            {notification.title}
          </h2>
          <p className="mt-1 break-words text-sm leading-6 text-[var(--text-secondary)]">
            {notification.body}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={notification.href}
          onClick={() => {
            if (!notification.read) {
              onMarkRead(notification.id);
            }
          }}
          className="inline-flex w-full justify-center rounded-lg bg-[var(--color-brand-primary)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] no-underline shadow-sm hover:bg-[var(--color-brand-primary-hover)] sm:w-auto"
        >
          Open
        </Link>
        {!notification.read ? (
          <button
            type="button"
            onClick={() => onMarkRead(notification.id)}
            className="w-full rounded-lg border border-[var(--border-strong)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-brand-contrast)] shadow-sm hover:bg-[var(--bg-tertiary)] sm:w-auto"
          >
            Mark read
          </button>
        ) : null}
      </div>
    </article>
  );
}

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<
    NotificationCategory | 'all' | 'unread'
  >('all');

  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: () => fetchNotifications({ limit: 50 }),
    refetchInterval: 30_000,
  });

  const notifications = useMemo(
    () =>
      (notificationsQuery.data?.notifications ?? []).map((notification) =>
        formatNotification(notification),
      ),
    [notificationsQuery.data?.notifications],
  );

  const unreadCount = notifications.filter((notification) => {
    return !notification.read;
  }).length;

  const filteredNotifications = notifications.filter((notification) => {
    if (filter === 'all') {
      return true;
    }
    if (filter === 'unread') {
      return !notification.read;
    }
    return notification.category === filter;
  });

  const filterCounts = useMemo(() => {
    return notifications.reduce<Record<string, number>>(
      (counts, notification) => ({
        ...counts,
        [notification.category]: (counts[notification.category] ?? 0) + 1,
        unread: counts.unread + (notification.read ? 0 : 1),
        all: counts.all + 1,
      }),
      { all: 0, unread: 0 },
    );
  }, [notifications]);

  const invalidateNotifications = () => {
    void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    void queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
  };

  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: invalidateNotifications,
  });

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: invalidateNotifications,
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[var(--color-brand-contrast)]">
            Activity
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-[var(--text-primary)]">
            Notifications
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            Track buyer messages, marketplace activity, listing status changes,
            and pickup-sensitive updates.
          </p>
        </div>
        <button
          type="button"
          disabled={unreadCount === 0 || markAllMutation.isPending}
          onClick={() => markAllMutation.mutate()}
          className="w-full rounded-lg border border-[var(--border-strong)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--color-brand-contrast)] shadow-sm hover:bg-[var(--bg-tertiary)] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {markAllMutation.isPending ? 'Marking...' : 'Mark all read'}
        </button>
      </div>

      <section className="mt-6 rounded-lg border border-[var(--border-default)] bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((item) => {
            const active = filter === item.value;
            const count = filterCounts[item.value] ?? 0;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                aria-pressed={active}
                className="rounded-lg border px-3 py-2 text-sm font-medium transition"
                style={{
                  borderColor: active
                    ? 'var(--color-brand-primary)'
                    : 'var(--border-default)',
                  background: active
                    ? 'var(--color-brand-primary-soft)'
                    : 'var(--bg-elevated)',
                  color: active
                    ? 'var(--text-primary)'
                    : 'var(--text-secondary)',
                }}
              >
                {item.label} ({count})
              </button>
            );
          })}
        </div>
      </section>

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
            className="mt-5 inline-flex rounded-lg bg-[var(--color-brand-primary)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] shadow-sm hover:bg-[var(--color-brand-primary-hover)]"
          >
            Browse marketplace
          </Link>
        </section>
      ) : null}

      {!notificationsQuery.isLoading &&
      !notificationsQuery.isError &&
      notifications.length > 0 &&
      filteredNotifications.length === 0 ? (
        <section className="mt-6 rounded-lg border border-dashed border-[var(--border-strong)] bg-white p-8 text-center">
          <h2 className="text-xl font-semibold">Nothing in this tab</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--text-secondary)]">
            Try another notification tab or wait for a new marketplace update.
          </p>
        </section>
      ) : null}

      {filteredNotifications.length > 0 ? (
        <section className="mt-6 space-y-3">
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
