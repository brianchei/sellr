import { AuthGate } from '@/components/auth-gate';
import { AppHeader } from '@/components/app-header';

export default function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <AuthGate>
        <AppHeader />
        {children}
      </AuthGate>
    </div>
  );
}
