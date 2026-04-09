import Link from 'next/link';

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">Sellr</h1>
      <p className="mt-3 text-zinc-600">
        Trust-native local marketplace for verified communities — Phase 0 scaffold.
      </p>
      <Link
        href="/dashboard"
        className="mt-8 inline-flex w-fit rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
      >
        Open dashboard
      </Link>
    </main>
  );
}
