'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';

const NAV_LINKS = [
  { label: 'Proof', href: '/#proof' },
  { label: 'How it works', href: '/#how-it-works' },
  { label: 'Benefits', href: '/#benefits' },
  { label: 'FAQ', href: '/#faq' },
] as const;

function SellrWordmark({ className = '' }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="Sellr home"
      className={`group inline-flex items-center no-underline ${className}`}
    >
      <Image
        src="/brand/sellr-symbol.png"
        alt=""
        width={36}
        height={36}
        priority
        className="h-9 w-9 rounded-lg object-contain sm:hidden"
      />
      <Image
        src="/brand/sellr-logo-full.png"
        alt=""
        width={128}
        height={40}
        priority
        className="hidden h-9 w-auto object-contain sm:block"
      />
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
          ? 'border-b border-black/10 bg-[rgba(255,255,255,0.86)] backdrop-blur-md backdrop-saturate-150'
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
              className="rounded-full px-3 py-2 text-sm font-semibold text-[var(--text-secondary)] no-underline transition hover:bg-white/70 hover:text-[var(--text-primary)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link
            href="/login"
            className="rounded-full px-3 py-2 text-sm font-semibold text-[var(--text-primary)] no-underline transition hover:bg-white/70"
          >
            Sign in
          </Link>
          <Link
            href="/login"
            className="app-action-primary px-4 py-2 text-sm active:translate-y-0"
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
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--text-secondary)] transition hover:bg-white/70 hover:text-[var(--text-primary)] md:hidden"
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
          className="animate-fade-in border-t border-black/10 bg-white/95 backdrop-blur md:hidden"
        >
          <nav className="flex flex-col gap-1 px-4 py-4" aria-label="Mobile">
            {NAV_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-2xl px-3 py-2.5 text-sm font-semibold text-[var(--text-secondary)] no-underline transition hover:bg-[var(--color-brand-primary-soft)] hover:text-[var(--text-primary)]"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex flex-col gap-2 border-t border-black/10 px-4 py-4">
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="app-action-secondary px-4 py-2.5 text-sm"
            >
              Sign in
            </Link>
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="app-action-primary px-4 py-2.5 text-sm"
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
