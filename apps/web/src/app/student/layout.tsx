'use client';

import type { ReactNode } from 'react';
import RoleGate from '@/components/RoleGate';

export default function StudentLayout({ children }: { children: ReactNode }) {
  return <RoleGate roles={['student']}>{children}</RoleGate>;
}
