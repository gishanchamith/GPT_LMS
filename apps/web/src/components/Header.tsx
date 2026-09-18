'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ROLES, type Role } from '@lp/shared';
import { useAuth } from '@/context/AuthContext';
import { Button, LinkButton, StatusBadge } from './ui';

interface NavLink {
  href: string;
  label: string;
}

const NAV: Record<Role | 'guest', NavLink[]> = {
  guest: [{ href: '/courses', label: 'Courses' }],
  [ROLES.STUDENT]: [
    { href: '/courses', label: 'Browse' },
    { href: '/student/my-courses', label: 'My courses' },
    { href: '/student/recommend', label: 'AI advisor' },
  ],
  [ROLES.INSTRUCTOR]: [
    { href: '/courses', label: 'Browse' },
    { href: '/instructor/courses', label: 'My courses' },
  ],
  [ROLES.ADMIN]: [
    { href: '/courses', label: 'Browse' },
    { href: '/admin', label: 'Dashboard' },
  ],
  [ROLES.SUPERADMIN]: [
    { href: '/courses', label: 'Browse' },
    { href: '/admin', label: 'Dashboard' },
  ],
};

function isActive(pathname: string, href: string): boolean {
  return pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));
}

export default function Header() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const links = NAV[user?.role ?? 'guest'];

  const navLinks = links.map((link) => (
    <Link
      key={link.href}
      href={link.href}
      onClick={() => setOpen(false)}
      className={`rounded-lg px-3 py-2 text-sm font-medium ${
        isActive(pathname, link.href)
          ? 'bg-brand-50 text-brand-700'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      {link.label}
    </Link>
  ));

  const account = loading ? null : user ? (
    <div className="flex items-center gap-3">
      <div className="text-right leading-tight">
        <p className="text-sm font-medium text-slate-900">{user.name}</p>
        <StatusBadge status={user.role} />
      </div>
      <Button variant="secondary" size="sm" onClick={logout}>
        Log out
      </Button>
    </div>
  ) : (
    <div className="flex items-center gap-2">
      <LinkButton href="/login" variant="ghost" size="sm">
        Log in
      </LinkButton>
      <LinkButton href="/register" size="sm">
        Sign up
      </LinkButton>
    </div>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold text-slate-900">
          <span className="flex size-8 items-center justify-center rounded-lg bg-brand-600 text-sm text-white">
            LH
          </span>
          LearnHub
        </Link>
        <nav className="hidden flex-1 items-center gap-1 md:flex">{navLinks}</nav>
        <div className="hidden md:block">{account}</div>
        <button
          className="ml-auto rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label="Toggle menu"
        >
          <svg
            className="size-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              d={open ? 'M6 6l12 12M6 18L18 6' : 'M4 7h16M4 12h16M4 17h16'}
            />
          </svg>
        </button>
      </div>
      {open && (
        <div className="border-t border-slate-200 px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-1">{navLinks}</nav>
          <div className="mt-3 border-t border-slate-100 pt-3">{account}</div>
        </div>
      )}
    </header>
  );
}
