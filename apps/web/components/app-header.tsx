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
  { label: 'Dashboard', href: '/dashboard', icon: DashboardIcon },
  { label: 'Browse', href: '/marketplace', icon: BrowseIcon },
  { label: 'Listings', href: '/listings', icon: ListingsIcon },
  { label: 'Inbox', href: '/inbox', icon: InboxIcon },
  { label: 'Notifications', href: '/notifications', icon: NotificationIcon },
];

function isActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  return pathname.startsWith(href + '/');
}

export function AppHeader() {
  const { logout, primaryCommunityId, userId } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement | null>(null);

  const unreadNotificationsQuery = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: () => fetchNotifications({ unreadOnly: true, limit: 50 }),
    enabled: Boolean(primaryCommunityId),
    refetchInterval: ACTIVITY_REFETCH_INTERVAL_MS,
  });
  const unreadCount =
    unreadNotificationsQuery.data?.notifications.length ?? 0;
  const unreadLabel = unreadCount > 9 ? '9+' : String(unreadCount);

  const [trackedPathname, setTrackedPathname] = useState(pathname);
  if (pathname !== trackedPathname) {
    setTrackedPathname(pathname);
    if (drawerOpen) setDrawerOpen(false);
    if (accountOpen) setAccountOpen(false);
  }

  useEffect(() => {
    if (!drawerOpen && !accountOpen) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDrawerOpen(false);
        setAccountOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [drawerOpen, accountOpen]);

  const handleLogout = () => {
    setAccountOpen(false);
    logout();
    router.push('/login');
  };

  return (
    <header
      className="sticky top-0 z-50 w-full border-b border-[var(--border-default)]"
      style={{
        background: 'rgba(250, 250, 247, 0.9)',
        backdropFilter: 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
      }}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
        <Link
          href="/dashboard"
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

        <nav
          className="hidden items-center gap-0.5 md:flex"
          aria-label="Primary"
        >
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            const showBadge =
              item.href === '/notifications' && unreadCount > 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className="relative inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium no-underline transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-contrast-muted)]"
                style={{
                  color: active
                    ? 'var(--color-brand-contrast)'
                    : 'var(--text-secondary)',
                  background: active
                    ? 'var(--color-brand-primary-soft)'
                    : 'transparent',
                }}
              >
                <item.icon />
                {item.label}
                {showBadge ? (
                  <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-brand-warm)] px-1 text-[10px] font-semibold leading-none text-white">
                    {unreadLabel}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/sell"
            className="hidden items-center gap-1.5 rounded-md bg-[var(--color-brand-primary)] px-3 py-1.5 text-sm font-semibold text-[var(--text-primary)] no-underline shadow-sm transition hover:bg-[var(--color-brand-primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-contrast-muted)] md:inline-flex"
          >
            <SellIcon />
            Sell
          </Link>

          <button
            type="button"
            onClick={() => setDrawerOpen((value) => !value)}
            aria-label={drawerOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={drawerOpen}
            aria-controls="app-mobile-drawer"
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border-default)] bg-white text-[var(--text-secondary)] shadow-sm transition hover:bg-[var(--bg-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-contrast-muted)] md:hidden"
          >
            {drawerOpen ? <CloseIcon /> : <MenuIcon />}
            {!drawerOpen && unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-brand-warm)] px-1 text-[10px] font-semibold leading-none text-white">
                {unreadLabel}
              </span>
            ) : null}
          </button>

          <div className="relative" ref={accountRef}>
            <button
              type="button"
              onClick={() => setAccountOpen((value) => !value)}
              aria-label="Account menu"
              aria-expanded={accountOpen}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-brand-contrast-soft)] text-[var(--color-brand-contrast)] transition hover:bg-[var(--color-brand-contrast-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-contrast-muted)]"
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
                  className="absolute right-0 z-50 mt-2 min-w-[200px] overflow-hidden rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] py-1 shadow-lg"
                  role="menu"
                >
                  <Link
                    href="/dashboard"
                    role="menuitem"
                    onClick={() => setAccountOpen(false)}
                    className="block px-4 py-2 text-sm text-[var(--text-secondary)] no-underline hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
                  >
                    Account
                  </Link>
                  {userId ? (
                    <Link
                      href={`/sellers/${userId}`}
                      role="menuitem"
                      onClick={() => setAccountOpen(false)}
                      className="block px-4 py-2 text-sm text-[var(--text-secondary)] no-underline hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
                    >
                      View public storefront
                    </Link>
                  ) : null}
                  <div
                    aria-hidden="true"
                    className="my-1 border-t border-[var(--border-default)]"
                  />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    className="block w-full cursor-pointer border-none bg-transparent px-4 py-2 text-left text-sm text-[var(--color-brand-warm-strong)] hover:bg-[var(--color-brand-warm-soft)]"
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
            className="fixed inset-0 top-14 z-40 bg-black/30 md:hidden"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <nav
            id="app-mobile-drawer"
            className="absolute left-0 right-0 top-14 z-50 border-b border-[var(--border-default)] bg-[var(--bg-elevated)] shadow-lg md:hidden"
            aria-label="Primary"
          >
            <div className="mx-auto max-w-6xl px-4 py-3">
              <Link
                href="/sell"
                onClick={() => setDrawerOpen(false)}
                className="mb-2 flex items-center justify-center gap-1.5 rounded-md bg-[var(--color-brand-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] no-underline shadow-sm hover:bg-[var(--color-brand-primary-hover)]"
              >
                <SellIcon />
                Sell an item
              </Link>
              <ul className="space-y-1">
                {NAV_ITEMS.map((item) => {
                  const active = isActive(pathname, item.href);
                  const showBadge =
                    item.href === '/notifications' && unreadCount > 0;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setDrawerOpen(false)}
                        aria-current={active ? 'page' : undefined}
                        className="flex items-center justify-between gap-3 rounded-md px-3 py-2.5 text-sm font-medium no-underline transition"
                        style={{
                          color: active
                            ? 'var(--color-brand-contrast)'
                            : 'var(--text-secondary)',
                          background: active
                            ? 'var(--color-brand-primary-soft)'
                            : 'transparent',
                        }}
                      >
                        <span className="inline-flex items-center gap-2">
                          <item.icon />
                          {item.label}
                        </span>
                        {showBadge ? (
                          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-brand-warm)] px-1.5 text-[10px] font-semibold leading-none text-white">
                            {unreadLabel}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
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
