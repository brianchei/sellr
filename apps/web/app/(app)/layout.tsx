import { AuthGate } from '@/components/auth-gate';
import { AppHeader } from '@/components/app-header';
import { AppFooter } from '@/components/app-footer';

export default function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-secondary)] text-[var(--text-primary)]">
      <AuthGate>
        <AppHeader />
        <div className="flex-1">{children}</div>
        <AppFooter />
      </AuthGate>
    </div>
  );
}
