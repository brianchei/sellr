import Link from 'next/link';

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center bg-[var(--bg-secondary)] px-6 py-16 text-[var(--text-primary)]">
      <div className="mb-6 flex items-center gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-brand-primary)] shadow-sm">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M3 9.5L12 4L21 9.5V20C21 20.55 20.55 21 20 21H4C3.45 21 3 20.55 3 20V9.5Z"
              stroke="white"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.25"
            />
            <path
              d="M9 21V13H15V21"
              stroke="white"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.25"
            />
          </svg>
        </span>
        <span className="text-xl font-bold">Sellr</span>
      </div>
      <p className="text-sm font-medium text-[var(--color-brand-contrast)]">
        Community marketplace
      </p>
      <h1 className="mt-1 text-3xl font-semibold">Sellr</h1>
      <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
        Trust-native local marketplace for verified communities.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/login"
          className="inline-flex w-fit rounded-lg bg-[var(--color-brand-primary)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] shadow-sm hover:bg-[var(--color-brand-primary-hover)]"
        >
          Sign in
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex w-fit rounded-lg border border-[var(--border-strong)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-brand-contrast)] shadow-sm hover:bg-[var(--bg-tertiary)]"
        >
          Dashboard
        </Link>
      </div>
    </main>
  );
}
