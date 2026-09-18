'use client';

import type { ReactNode } from 'react';
import RoleGate from '@/components/RoleGate';

export default function SuperadminOnly({ children }: { children: ReactNode }) {
  return <RoleGate roles={['superadmin']}>{children}</RoleGate>;
}
