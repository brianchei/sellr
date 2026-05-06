'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';

const NAV_LINKS = [
  { label: 'Why Sellr', href: '/#why' },
  { label: 'How it works', href: '/#how-it-works' },
  { label: 'Trust & safety', href: '/#trust' },
  { label: 'For sellers', href: '/#sellers' },
] as const;

function SellrWordmark({ className = '' }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="Sellr home"
      className={`group inline-flex items-center no-underline ${className}`}
    >
      <Image
        src="/brand/sellr-logo-mark.png"
        alt=""
        width={32}
        height={32}
        priority
        className="h-8 w-8 rounded-md object-contain"
      />
      <span className="ml-2 text-lg font-bold tracking-tight text-[var(--text-primary)]">
        Sellr
      </span>
    </Link>
  );
}

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [mobileOpen]);

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-colors duration-200 ${
        scrolled
          ? 'border-b border-[var(--border-default)] bg-[rgba(250,250,247,0.92)] backdrop-blur-md backdrop-saturate-150'
          : 'border-b border-transparent bg-transparent'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
        <SellrWordmark />

        <nav
          className="hidden items-center gap-1 md:flex"
          aria-label="Marketing navigation"
        >
          {NAV_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-[var(--text-secondary)] no-underline transition hover:bg-[var(--color-brand-contrast-soft)] hover:text-[var(--text-primary)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link
            href="/login"
            className="rounded-md px-3 py-2 text-sm font-medium text-[var(--color-brand-contrast)] no-underline transition hover:bg-[var(--color-brand-contrast-soft)]"
          >
            Sign in
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-brand-primary)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] no-underline shadow-sm transition hover:-translate-y-px hover:bg-[var(--color-brand-primary-hover)] hover:shadow-md active:translate-y-0"
          >
            Join your community
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
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          aria-expanded={mobileOpen}
          aria-controls="sellr-mobile-menu"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          className="inline-flex h-10 w-10 items-center justify-center rounded-md text-[var(--text-secondary)] transition hover:bg-[var(--color-brand-contrast-soft)] hover:text-[var(--text-primary)] md:hidden"
        >
          {mobileOpen ? (
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          ) : (
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          )}
        </button>
      </div>

      {mobileOpen ? (
        <div
          id="sellr-mobile-menu"
          className="animate-fade-in border-t border-[var(--border-default)] bg-[var(--bg-elevated)] md:hidden"
        >
          <nav className="flex flex-col gap-1 px-4 py-4" aria-label="Mobile">
            {NAV_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-md px-3 py-2.5 text-sm font-medium text-[var(--text-secondary)] no-underline transition hover:bg-[var(--color-brand-contrast-soft)] hover:text-[var(--text-primary)]"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex flex-col gap-2 border-t border-[var(--border-default)] px-4 py-4">
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="inline-flex items-center justify-center rounded-lg border border-[var(--border-strong)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--color-brand-contrast)] no-underline shadow-sm hover:bg-[var(--bg-secondary)]"
            >
              Sign in
            </Link>
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="inline-flex items-center justify-center rounded-lg bg-[var(--color-brand-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] no-underline shadow-sm hover:bg-[var(--color-brand-primary-hover)]"
            >
              Join your community
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}

export { SellrWordmark };
