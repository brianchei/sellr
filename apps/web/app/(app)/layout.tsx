import { AuthGate } from '@/components/auth-gate';
import { AppHeader } from '@/components/app-header';

export default function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--bg-secondary)] text-[var(--text-primary)]">
      <AuthGate>
        <AppHeader />
        {children}
      </AuthGate>
    </div>
  );
}
