'use client';

import Link from 'next/link';
import { useState } from 'react';

function SellrLogo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 no-underline">
      <div
        className="flex h-9 w-9 items-center justify-center rounded-lg"
        style={{
          background: 'var(--color-brand-primary)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M3 9.5L12 4L21 9.5V20C21 20.55 20.55 21 20 21H4C3.45 21 3 20.55 3 20V9.5Z"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M9 21V13H15V21"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <span
        className="text-xl font-bold"
        style={{ color: 'var(--text-primary)' }}
      >
        Sellr
      </span>
    </Link>
  );
}

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

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
      <div
        className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4"
        style={{ gap: '32px' }}
      >
        <SellrLogo />

        {/* Desktop Navigation */}
        <nav
          className="hidden items-center md:flex"
          style={{ gap: '8px' }}
          aria-label="Main navigation"
        >
          {[
            { label: 'Browse', href: '/#categories' },
            { label: 'How it Works', href: '/#how-it-works' },
            { label: 'Trust & Safety', href: '/#trust' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="btn-ghost btn-sm no-underline"
              style={{
                color: 'var(--text-secondary)',
                borderRadius: 'var(--radius-md)',
                padding: '7px 14px',
                fontSize: 'var(--text-sm)',
                fontWeight: 500,
                transition: 'all var(--duration-fast) var(--ease-out)',
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Desktop Auth CTAs */}
        <div className="hidden items-center md:flex" style={{ gap: '10px' }}>
          <Link href="/login" className="btn btn-ghost btn-sm no-underline">
            Sign in
          </Link>
          <Link href="/login" className="btn btn-primary btn-sm no-underline">
            Get Started
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          type="button"
          className="btn-ghost flex items-center justify-center md:hidden"
          style={{
            width: '40px',
            height: '40px',
            padding: 0,
            borderRadius: 'var(--radius-md)',
          }}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div
          className="animate-fade-in border-t md:hidden"
          style={{
            background: 'var(--bg-primary)',
            borderColor: 'var(--border-default)',
            padding: '16px',
          }}
        >
          <nav className="flex flex-col" style={{ gap: '4px' }}>
            {[
              { label: 'Browse', href: '/#categories' },
              { label: 'How it Works', href: '/#how-it-works' },
              { label: 'Trust & Safety', href: '/#trust' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="no-underline"
                style={{
                  display: 'block',
                  padding: '10px 14px',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 500,
                  color: 'var(--text-secondary)',
                  borderRadius: 'var(--radius-md)',
                  transition: 'all var(--duration-fast) var(--ease-out)',
                }}
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div
            className="mt-3 flex flex-col border-t pt-3"
            style={{ gap: '8px', borderColor: 'var(--border-default)' }}
          >
            <Link href="/login" className="btn btn-secondary w-full no-underline">
              Sign in
            </Link>
            <Link href="/login" className="btn btn-primary w-full no-underline">
              Get Started
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

export { SellrLogo };
