'use client';

import { ROLES } from '@lp/shared';
import { useAuth } from '@/context/AuthContext';
import { LinkButton } from './ui';

// The landing page's buttons depend on who is looking: no sign-up pitch for signed-in users.
export default function HomeActions() {
  const { user, loading, home } = useAuth();

  const browse = (
    <LinkButton href="/courses" size="lg">
      Browse courses
    </LinkButton>
  );

  // Keep the layout steady while the session loads instead of flashing the guest buttons.
  if (loading) return <div className="mt-8 flex justify-center gap-3">{browse}</div>;

  let secondary;
  if (!user) {
    secondary = (
      <>
        <LinkButton href="/advisor" variant="secondary" size="lg">
          Try the AI advisor
        </LinkButton>
        <LinkButton href="/register" variant="ghost" size="lg">
          Create a free account
        </LinkButton>
      </>
    );
  } else if (user.role === ROLES.STUDENT) {
    secondary = (
      <>
        <LinkButton href="/advisor" variant="secondary" size="lg">
          Ask the AI advisor
        </LinkButton>
        <LinkButton href="/student/my-courses" variant="ghost" size="lg">
          My courses
        </LinkButton>
      </>
    );
  } else {
    secondary = (
      <LinkButton href={home} variant="secondary" size="lg">
        Go to my dashboard
      </LinkButton>
    );
  }

  return (
    <div className="mt-8 flex flex-wrap justify-center gap-3">
      {browse}
      {secondary}
    </div>
  );
}
