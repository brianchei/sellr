'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/components/auth-provider';

export function AppHeader() {
  const { logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header
      className="sticky top-0 z-50 w-full"
      style={{
        background: 'rgba(250, 250, 247, 0.9)',
        backdropFilter: 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        borderBottom: '1px solid var(--border-default)',
      }}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 no-underline">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{
              background: 'var(--color-brand-primary)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M3 9.5L12 4L21 9.5V20C21 20.55 20.55 21 20 21H4C3.45 21 3 20.55 3 20V9.5Z"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M9 21V13H15V21"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span
            className="text-lg font-bold"
            style={{ color: 'var(--text-primary)' }}
          >
            Sellr
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center sm:flex" style={{ gap: '4px' }}>
          {[
            { label: 'Dashboard', href: '/dashboard', icon: DashboardIcon },
            { label: 'Browse', href: '/marketplace', icon: BrowseIcon },
            { label: 'Inbox', href: '/inbox', icon: InboxIcon },
            { label: 'Sell', href: '/sell', icon: SellIcon },
          ].map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="no-underline"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 500,
                  color: active
                    ? 'var(--color-brand-contrast)'
                    : 'var(--text-secondary)',
                  background: active ? 'var(--color-brand-primary-soft)' : 'transparent',
                  borderRadius: 'var(--radius-md)',
                  transition: 'all var(--duration-fast) var(--ease-out)',
                }}
              >
                <item.icon />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center" style={{ gap: '10px' }}>
          {/* User Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center justify-center rounded-full"
              style={{
                width: '34px',
                height: '34px',
                background: 'var(--color-brand-contrast-soft)',
                color: 'var(--color-brand-contrast)',
                transition: 'all var(--duration-fast) var(--ease-out)',
                cursor: 'pointer',
                border: 'none',
              }}
              aria-label="User menu"
              aria-expanded={menuOpen}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setMenuOpen(false)}
                  aria-hidden="true"
                />
                <div
                  className="animate-fade-in absolute right-0 z-50 mt-2 min-w-[180px] rounded-xl border py-1"
                  style={{
                    background: 'var(--bg-elevated)',
                    borderColor: 'var(--border-default)',
                    boxShadow: 'var(--shadow-xl)',
                  }}
                >
                  <Link
                    href="/dashboard"
                    className="block w-full px-4 py-2.5 text-left text-sm no-underline sm:hidden"
                    style={{ color: 'var(--text-secondary)' }}
                    onClick={() => setMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/marketplace"
                    className="block w-full px-4 py-2.5 text-left text-sm no-underline sm:hidden"
                    style={{ color: 'var(--text-secondary)' }}
                    onClick={() => setMenuOpen(false)}
                  >
                    Browse
                  </Link>
                  <Link
                    href="/sell"
                    className="block w-full px-4 py-2.5 text-left text-sm no-underline sm:hidden"
                    style={{ color: 'var(--text-secondary)' }}
                    onClick={() => setMenuOpen(false)}
                  >
                    Sell
                  </Link>
                  <Link
                    href="/inbox"
                    className="block w-full px-4 py-2.5 text-left text-sm no-underline sm:hidden"
                    style={{ color: 'var(--text-secondary)' }}
                    onClick={() => setMenuOpen(false)}
                  >
                    Inbox
                  </Link>
                  <div className="my-1 sm:hidden" style={{ borderTop: '1px solid var(--border-default)' }} />
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="block w-full cursor-pointer border-none bg-transparent px-4 py-2.5 text-left text-sm"
                    style={{ color: 'var(--color-error)' }}
                  >
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function DashboardIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function BrowseIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function InboxIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
      <path d="M8 9h8" />
      <path d="M8 13h5" />
    </svg>
  );
}

function SellIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}
