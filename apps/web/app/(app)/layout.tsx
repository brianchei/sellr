import { AuthGate } from '@/components/auth-gate';
import { AppHeader } from '@/components/app-header';
import { AppFooter } from '@/components/app-footer';
import { RealtimeProvider } from '@/components/realtime-provider';

export default function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-shell-bg flex min-h-screen flex-col text-[var(--text-primary)]">
      <AuthGate>
        <RealtimeProvider />
        <AppHeader />
        <div className="flex-1">{children}</div>
        <AppFooter />
      </AuthGate>
    </div>
  );
}
