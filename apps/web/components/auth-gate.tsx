'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useAuth } from '@/components/auth-provider';

export function AuthGate({ children }: { children: ReactNode }) {
  const { hydrated, isAuthenticated, communityIds } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      router.replace('/login');
      return;
    }

    if (!hydrated || !isAuthenticated || communityIds === null) {
      return;
    }

    if (communityIds.length === 0 && pathname !== '/onboarding') {
      router.replace('/onboarding');
      return;
    }

    if (communityIds.length > 0 && pathname === '/onboarding') {
      router.replace('/dashboard');
    }
  }, [communityIds, hydrated, isAuthenticated, pathname, router]);

  if (!hydrated || (isAuthenticated && communityIds === null)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-secondary)] text-sm text-[var(--text-tertiary)]">
        Loading…
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (communityIds?.length === 0 && pathname !== '/onboarding') {
    return null;
  }

  if (communityIds && communityIds.length > 0 && pathname === '/onboarding') {
    return null;
  }

  return <>{children}</>;
}
