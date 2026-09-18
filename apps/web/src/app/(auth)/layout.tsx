import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <div className="mx-auto flex max-w-md flex-col py-6 sm:py-12">{children}</div>;
}
