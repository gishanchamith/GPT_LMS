'use client';

import type { ReactNode } from 'react';
import RoleGate from '@/components/RoleGate';
import { useAuth } from '@/context/AuthContext';

function PendingBanner() {
  const { user } = useAuth();
  if (user?.status !== 'pending') return null;
  return (
    <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
      <p className="font-semibold">Your instructor account is awaiting approval</p>
      <p className="mt-1">
        An admin will review your application shortly. You can explore the platform in the meantime;
        creating courses unlocks once you're approved.
      </p>
    </div>
  );
}

export default function InstructorLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGate roles={['instructor']}>
      <PendingBanner />
      {children}
    </RoleGate>
  );
}
