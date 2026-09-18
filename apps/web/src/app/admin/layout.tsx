'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PERMISSIONS } from '@lp/shared';
import RoleGate from '@/components/RoleGate';
import { useAuth } from '@/context/AuthContext';

const LINKS = [
  { href: '/admin', label: 'Overview', permission: PERMISSIONS.STATS_READ },
  { href: '/admin/users', label: 'Users', permission: PERMISSIONS.USER_READ },
  {
    href: '/admin/instructors',
    label: 'Instructor approvals',
    permission: PERMISSIONS.INSTRUCTOR_APPROVE,
  },
  { href: '/admin/courses', label: 'Courses', permission: PERMISSIONS.COURSE_READ_ANY },
  { href: '/admin/categories', label: 'Categories', permission: PERMISSIONS.CATEGORY_MANAGE },
  { href: '/admin/admins', label: 'Admins', permission: PERMISSIONS.ADMIN_MANAGE },
  { href: '/admin/audit-logs', label: 'Audit log', permission: PERMISSIONS.AUDIT_READ },
];

function Sidebar() {
  const { can } = useAuth();
  const pathname = usePathname();
  // The menu is derived from the same permission map the API enforces.
  const links = LINKS.filter((l) => can(l.permission));

  return (
    <nav className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
      {links.map((link) => {
        // Nested pages (e.g. /admin/courses/[id]/edit) keep their section highlighted.
        const active =
          pathname === link.href ||
          (link.href !== '/admin' && pathname.startsWith(`${link.href}/`));
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap ${
              active
                ? 'bg-white text-brand-700 shadow-sm ring-1 ring-slate-200'
                : 'text-slate-600 hover:bg-white hover:text-slate-900'
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGate roles={['admin', 'superadmin']}>
      <div className="grid gap-6 lg:grid-cols-[13rem_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Sidebar />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </RoleGate>
  );
}
