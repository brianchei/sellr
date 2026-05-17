'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchNotifications } from '@sellr/api-client';
import { useAuth } from '@/components/auth-provider';
import { ACTIVITY_REFETCH_INTERVAL_MS } from '@/lib/query-refresh';

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType;
};

const NAV_ITEMS: NavItem[] = [
  { label: 'Browse', href: '/marketplace', icon: BrowseIcon },
  { label: 'Inbox', href: '/inbox', icon: InboxIcon },
  { label: 'Profile', href: '/profile', icon: ProfileIcon },
];

const MOBILE_NAV_ITEMS: NavItem[] = [
  { label: 'Home', href: '/dashboard', icon: DashboardIcon },
  ...NAV_ITEMS,
];

const SELLER_TOOL_ITEMS: NavItem[] = [
  { label: 'My listings', href: '/listings', icon: ListingsIcon },
];

function isActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  return pathname.startsWith(href + '/');
}

function communityHomeHref(communityId: string): string {
  return `/communities/${communityId}`;
}

const JOIN_COMMUNITY_HREF = '/communities/join';

export function AppHeader() {
  const {
    communities,
    logout,
    primaryCommunity,
    primaryCommunityId,
    setPrimaryCommunityId,
    userId,
  } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [communityOpen, setCommunityOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement | null>(null);
  const communityRef = useRef<HTMLDivElement | null>(null);

  const unreadNotificationsQuery = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: () => fetchNotifications({ unreadOnly: true, limit: 50 }),
    enabled: Boolean(primaryCommunityId),
    refetchInterval: ACTIVITY_REFETCH_INTERVAL_MS,
  });
  const unreadCount =
    unreadNotificationsQuery.data?.notifications.length ?? 0;
  const unreadLabel = unreadCount > 9 ? '9+' : String(unreadCount);

  useEffect(() => {
    if (!drawerOpen && !accountOpen && !communityOpen) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDrawerOpen(false);
        setAccountOpen(false);
        setCommunityOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [drawerOpen, accountOpen, communityOpen]);

  const handleLogout = () => {
    setAccountOpen(false);
    logout();
    router.push('/login');
  };

  const handleCommunityChange = (communityId: string) => {
    setPrimaryCommunityId(communityId);
    setCommunityOpen(false);
    setAccountOpen(false);
    setDrawerOpen(false);
  };

  const communityCount = communities?.length ?? 0;
  const canSwitchCommunity = communityCount > 1;
  const notificationsActive = isActive(pathname, '/notifications');

  return (
    <header
      className="sticky top-0 z-50 w-full border-b border-[var(--border-default)] bg-[var(--bg-primary)]"
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Link
          href="/dashboard"
          aria-label="Home"
          className="flex shrink-0 items-center gap-2 no-underline"
        >
          <Image
            src="/brand/sellr-symbol.png"
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 rounded-lg object-contain sm:hidden"
            priority
          />
          <Image
            src="/brand/sellr-logo-full.png"
            alt=""
            width={112}
            height={36}
            className="hidden h-8 w-auto object-contain sm:block"
            priority
          />
        </Link>

        {primaryCommunity ? (
          <div className="relative hidden lg:block" ref={communityRef}>
            <button
              type="button"
              onClick={() => {
                if (canSwitchCommunity) {
                  setCommunityOpen((value) => !value);
                  setAccountOpen(false);
                } else if (primaryCommunityId) {
                  router.push(communityHomeHref(primaryCommunityId));
                }
              }}
              aria-label={
                canSwitchCommunity
                  ? 'Switch active community'
                  : 'Open current community'
              }
              aria-expanded={canSwitchCommunity ? communityOpen : undefined}
              className="inline-flex max-w-[190px] items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--border-strong)] hover:bg-[var(--bg-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-contrast-muted)]"
            >
              <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--color-brand-accent)]" />
              <span className="truncate">{primaryCommunity.name}</span>
              {canSwitchCommunity ? (
                <span
                  aria-hidden="true"
                  className="text-xs text-[var(--text-tertiary)]"
                >
                  v
                </span>
              ) : null}
            </button>

            {communityOpen && canSwitchCommunity ? (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setCommunityOpen(false)}
                  aria-hidden="true"
                />
                <div
                  className="absolute left-0 z-50 mt-2 min-w-[240px] overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--bg-primary)] p-2 shadow-[var(--shadow-app-card)]"
                  role="menu"
                >
                  <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                    Active community
                  </p>
                  {primaryCommunityId ? (
                    <Link
                      href={communityHomeHref(primaryCommunityId)}
                      role="menuitem"
                      onClick={() => setCommunityOpen(false)}
                      className="mx-1 mb-1 block rounded-xl bg-[var(--color-brand-primary-soft)] px-3 py-2 text-sm font-semibold text-[var(--color-brand-primary-strong)] no-underline hover:bg-[var(--color-brand-primary-muted)]"
                    >
                      Open community home
                    </Link>
                  ) : null}
                  <Link
                    href={JOIN_COMMUNITY_HREF}
                    role="menuitem"
                    onClick={() => setCommunityOpen(false)}
                    className="mx-1 mb-1 block rounded-xl px-3 py-2 text-sm font-semibold text-[var(--text-secondary)] no-underline hover:bg-[var(--color-brand-primary-soft)] hover:text-[var(--text-primary)]"
                  >
                    Join another community
                  </Link>
                  {communities?.map((community) => {
                    const active = community.id === primaryCommunityId;
                    return (
                      <button
                        key={community.id}
                        type="button"
                        role="menuitemradio"
                        aria-checked={active}
                        onClick={() => handleCommunityChange(community.id)}
                        className="flex w-full items-center justify-between gap-3 rounded-xl border-0 bg-transparent px-3 py-2 text-left text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--color-brand-primary-soft)] hover:text-[var(--text-primary)]"
                      >
                        <span className="min-w-0">
                          <span className="block truncate">
                            {community.name}
                          </span>
                          <span className="block text-xs font-normal capitalize text-[var(--text-tertiary)]">
                            {community.type.replaceAll('_', ' ')}
                          </span>
                        </span>
                        {active ? (
                          <span className="rounded-full bg-[var(--color-brand-accent-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-brand-accent-strong)]">
                            Current
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : null}
          </div>
        ) : null}

        <nav
          className="hidden items-center gap-0.5 md:flex"
          aria-label="Primary"
        >
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className="relative inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold no-underline transition hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-contrast-muted)]"
                style={{
                  color: active ? 'var(--color-brand-primary)' : '#2e2a24',
                  background: active
                    ? 'var(--text-primary)'
                    : 'transparent',
                }}
              >
                <item.icon />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/sell"
            className="app-action-primary hidden px-4 py-2 text-sm md:inline-flex"
          >
            <SellIcon />
            Sell
          </Link>

          <Link
            href="/notifications"
            aria-label={
              unreadCount > 0
                ? `${unreadCount} unread notifications`
                : 'Notifications'
            }
            aria-current={notificationsActive ? 'page' : undefined}
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] transition hover:border-[var(--border-strong)] hover:bg-[var(--bg-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-contrast-muted)]"
            style={{
              background: notificationsActive
                ? 'var(--text-primary)'
                : undefined,
              color: notificationsActive
                ? 'var(--color-brand-primary)'
                : undefined,
            }}
          >
            <NotificationIcon />
            {unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-brand-warm)] px-1 text-[10px] font-semibold leading-none text-white">
                {unreadLabel}
              </span>
            ) : null}
          </Link>

          <button
            type="button"
            onClick={() => setDrawerOpen((value) => !value)}
            aria-label={drawerOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={drawerOpen}
            aria-controls="app-mobile-drawer"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] transition hover:border-[var(--border-strong)] hover:bg-[var(--bg-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-contrast-muted)] md:hidden"
          >
            {drawerOpen ? <CloseIcon /> : <MenuIcon />}
          </button>

          <div className="relative" ref={accountRef}>
            <button
              type="button"
              onClick={() => {
                setAccountOpen((value) => !value);
                setCommunityOpen(false);
              }}
              aria-label="Account menu"
              aria-expanded={accountOpen}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--text-primary)] text-[var(--color-brand-primary)] shadow-sm transition hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-contrast-muted)]"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </button>

            {accountOpen ? (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setAccountOpen(false)}
                  aria-hidden="true"
                />
                <div
                  className="absolute right-0 z-50 mt-2 min-w-[220px] overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--bg-primary)] py-2 shadow-[var(--shadow-app-card)]"
                  role="menu"
                >
                  {primaryCommunity && canSwitchCommunity ? (
                    <>
                      <div className="mx-2 rounded-xl bg-[var(--color-brand-primary-soft)] px-3 py-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand-primary-strong)]">
                          Active community
                        </p>
                        <p className="mt-1 truncate text-sm font-semibold text-[var(--text-primary)]">
                          {primaryCommunity.name}
                        </p>
                      </div>
                      <div className="mx-2 mt-1 grid gap-1">
                        {communities?.map((community) => {
                          const active = community.id === primaryCommunityId;
                          return (
                            <button
                              key={community.id}
                              type="button"
                              role="menuitemradio"
                              aria-checked={active}
                              onClick={() =>
                                handleCommunityChange(community.id)
                              }
                              className={`rounded-xl border-0 px-3 py-2 text-left text-xs font-semibold ${
                                active
                                  ? 'bg-[var(--color-brand-accent-soft)] text-[var(--color-brand-accent-strong)]'
                                  : 'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--color-brand-primary-soft)] hover:text-[var(--text-primary)]'
                              }`}
                            >
                              {community.name}
                            </button>
                          );
                        })}
                      </div>
                      <div
                        aria-hidden="true"
                        className="my-1 border-t border-black/10"
                      />
                    </>
                  ) : null}
                  {primaryCommunityId ? (
                    <Link
                      href={communityHomeHref(primaryCommunityId)}
                      role="menuitem"
                      onClick={() => setAccountOpen(false)}
                      className="mx-2 block rounded-xl px-3 py-2 text-sm font-medium text-[var(--text-secondary)] no-underline hover:bg-[var(--color-brand-primary-soft)] hover:text-[var(--text-primary)]"
                    >
                      Community home
                    </Link>
                  ) : null}
                  <Link
                    href={JOIN_COMMUNITY_HREF}
                    role="menuitem"
                    onClick={() => setAccountOpen(false)}
                    className="mx-2 block rounded-xl px-3 py-2 text-sm font-medium text-[var(--text-secondary)] no-underline hover:bg-[var(--color-brand-primary-soft)] hover:text-[var(--text-primary)]"
                  >
                    Join another community
                  </Link>
                  <Link
                    href="/dashboard"
                    role="menuitem"
                    onClick={() => setAccountOpen(false)}
                    className="mx-2 block rounded-xl px-3 py-2 text-sm font-medium text-[var(--text-secondary)] no-underline hover:bg-[var(--color-brand-primary-soft)] hover:text-[var(--text-primary)]"
                  >
                    Home
                  </Link>
                  {SELLER_TOOL_ITEMS.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      role="menuitem"
                      onClick={() => setAccountOpen(false)}
                      className="mx-2 block rounded-xl px-3 py-2 text-sm font-medium text-[var(--text-secondary)] no-underline hover:bg-[var(--color-brand-primary-soft)] hover:text-[var(--text-primary)]"
                    >
                      {item.label}
                    </Link>
                  ))}
                  <Link
                    href="/profile"
                    role="menuitem"
                    onClick={() => setAccountOpen(false)}
                    className="mx-2 block rounded-xl px-3 py-2 text-sm font-medium text-[var(--text-secondary)] no-underline hover:bg-[var(--color-brand-primary-soft)] hover:text-[var(--text-primary)]"
                  >
                    Profile
                  </Link>
                  {userId ? (
                    <Link
                      href={`/sellers/${userId}`}
                      role="menuitem"
                      onClick={() => setAccountOpen(false)}
                      className="mx-2 block rounded-xl px-3 py-2 text-sm font-medium text-[var(--text-secondary)] no-underline hover:bg-[var(--color-brand-primary-soft)] hover:text-[var(--text-primary)]"
                    >
                      View public storefront
                    </Link>
                  ) : null}
                  <div
                    aria-hidden="true"
                    className="my-1 border-t border-black/10"
                  />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    className="mx-2 block w-[calc(100%-1rem)] cursor-pointer rounded-xl border-none bg-transparent px-3 py-2 text-left text-sm font-medium text-[var(--color-brand-warm-strong)] hover:bg-[var(--color-brand-warm-soft)]"
                  >
                    Sign out
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {drawerOpen ? (
        <>
          <div
            className="fixed inset-0 top-16 z-40 bg-black/30 backdrop-blur-sm md:hidden"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <nav
            id="app-mobile-drawer"
            className="absolute left-3 right-3 top-16 z-50 overflow-hidden rounded-b-3xl border border-[var(--border-default)] bg-[var(--bg-primary)] shadow-[var(--shadow-app-card-hover)] md:hidden"
            aria-label="Primary"
          >
            <div className="mx-auto max-w-6xl px-4 py-3">
              {primaryCommunity ? (
                <div className="mb-3 rounded-2xl border border-black/10 bg-[var(--color-brand-primary-soft)] p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand-primary-strong)]">
                    Current community
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
                    {primaryCommunity.name}
                  </p>
                  {primaryCommunityId ? (
                    <Link
                      href={communityHomeHref(primaryCommunityId)}
                      onClick={() => setDrawerOpen(false)}
                      className="mt-3 inline-flex text-xs font-semibold text-[var(--color-brand-contrast)] no-underline hover:underline"
                    >
                      Open community home
                    </Link>
                  ) : null}
                  <Link
                    href={JOIN_COMMUNITY_HREF}
                    onClick={() => setDrawerOpen(false)}
                    className="ml-3 mt-3 inline-flex text-xs font-semibold text-[var(--color-brand-contrast)] no-underline hover:underline"
                  >
                    Join another community
                  </Link>
                  {canSwitchCommunity ? (
                    <div className="mt-3 grid gap-1">
                      {communities?.map((community) => {
                        const active = community.id === primaryCommunityId;
                        return (
                          <button
                            key={community.id}
                            type="button"
                            onClick={() => handleCommunityChange(community.id)}
                            className={`rounded-xl border px-3 py-2 text-left text-xs font-semibold ${
                              active
                                ? 'border-[var(--color-brand-accent-muted)] bg-[var(--color-brand-accent-soft)] text-[var(--color-brand-accent-strong)]'
                                : 'border-black/10 bg-white/80 text-[var(--text-secondary)]'
                            }`}
                          >
                            {community.name}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              ) : null}
              <Link
                href="/sell"
                onClick={() => setDrawerOpen(false)}
                className="app-action-primary mb-2 flex px-4 py-2.5 text-sm"
              >
                <SellIcon />
                Sell an item
              </Link>
              <Link
                href="/notifications"
                onClick={() => setDrawerOpen(false)}
                aria-current={notificationsActive ? 'page' : undefined}
                className="mb-2 flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold no-underline transition"
                style={{
                  color: notificationsActive
                    ? 'var(--color-brand-primary)'
                    : 'var(--text-secondary)',
                  background: notificationsActive
                    ? 'var(--text-primary)'
                    : 'transparent',
                }}
              >
                <span className="inline-flex items-center gap-2">
                  <NotificationIcon />
                  Notifications
                </span>
                {unreadCount > 0 ? (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-brand-warm)] px-1.5 text-[10px] font-semibold leading-none text-white">
                    {unreadLabel}
                  </span>
                ) : null}
              </Link>
              <ul className="space-y-1">
                {MOBILE_NAV_ITEMS.map((item) => {
                  const active = isActive(pathname, item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setDrawerOpen(false)}
                        aria-current={active ? 'page' : undefined}
                        className="flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold no-underline transition"
                        style={{
                          color: active
                            ? 'var(--color-brand-primary)'
                            : 'var(--text-secondary)',
                          background: active
                            ? 'var(--text-primary)'
                            : 'transparent',
                        }}
                      >
                        <span className="inline-flex items-center gap-2">
                          <item.icon />
                          {item.label}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-3 border-t border-[var(--border-default)] pt-3">
                <p className="px-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                  Seller tools
                </p>
                <ul className="mt-1 space-y-1">
                  {SELLER_TOOL_ITEMS.map((item) => {
                    const active = isActive(pathname, item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setDrawerOpen(false)}
                          aria-current={active ? 'page' : undefined}
                          className="flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold no-underline transition"
                          style={{
                            color: active
                              ? 'var(--color-brand-primary)'
                              : 'var(--text-secondary)',
                            background: active
                              ? 'var(--text-primary)'
                              : 'transparent',
                          }}
                        >
                          <span className="inline-flex items-center gap-2">
                            <item.icon />
                            {item.label}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </nav>
        </>
      ) : null}
    </header>
  );
}

/* -------------------------------------------------------------------------- */
/* Icons                                                                      */
/* -------------------------------------------------------------------------- */

function DashboardIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function BrowseIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function InboxIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
      <path d="M8 9h8" />
      <path d="M8 13h5" />
    </svg>
  );
}

function ListingsIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 6h13" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
      <path d="M3 6h.01" />
      <path d="M3 12h.01" />
      <path d="M3 18h.01" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M20 21a8 8 0 0 0-16 0" />
    </svg>
  );
}

function NotificationIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function SellIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M3 12h18" />
      <path d="M3 18h18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
