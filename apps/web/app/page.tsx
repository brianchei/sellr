import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center bg-[var(--bg-secondary)] px-6 py-16 text-[var(--text-primary)]">
      <div className="mb-6 flex items-center gap-2">
        <Image
          src="/brand/sellr-logo-mark.png"
          alt=""
          width={40}
          height={40}
          className="h-10 w-10 object-contain"
          priority
        />
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
