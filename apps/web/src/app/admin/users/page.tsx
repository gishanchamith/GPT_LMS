'use client';

import { useEffect, useState, type ChangeEvent } from 'react';
import {
  ASSIGNABLE_ROLES,
  outranks,
  PERMISSIONS,
  ROLES,
  USER_STATUS,
  type UserStatus,
} from '@lp/shared';
import { useAuth } from '@/context/AuthContext';
import { useConfirm } from '@/context/ConfirmContext';
import { useToast } from '@/context/ToastContext';
import { useApiData } from '@/hooks/useApiData';
import { api, errorMessage, type ApiResponse } from '@/lib/api';
import { capitalize, formatDate } from '@/lib/format';
import type { User } from '@/types/api';
import Pagination from '@/components/Pagination';
import { AsyncView, EmptyState } from '@/components/States';
import { Button, Input, PageHeader, Select, StatusBadge, Table, Td } from '@/components/ui';

function UserActions({ target, onChanged }: { target: User; onChanged: (user: User) => void }) {
  const { user, can } = useAuth();
  const confirm = useConfirm();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  // Mirrors the API's hierarchy rule, just to hide buttons that would be refused.
  const manageable = user && target._id !== user._id && outranks(user.role, target.role);
  if (!manageable) return <span className="text-xs text-slate-400">—</span>;

  const run = async (request: () => Promise<ApiResponse<User>>, success: string) => {
    setBusy(true);
    try {
      const { data } = await request();
      onChanged(data);
      toast.success(success);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (status: UserStatus) => {
    if (status === USER_STATUS.SUSPENDED) {
      const ok = await confirm({
        title: `Suspend ${target.name}?`,
        message:
          'They will be signed out everywhere immediately and cannot sign back in until reactivated.',
        confirmLabel: 'Suspend',
        tone: 'danger',
      });
      if (!ok) return;
    }
    await run(
      () => api<User>(`/admin/users/${target._id}/status`, { method: 'PATCH', body: { status } }),
      status === USER_STATUS.SUSPENDED
        ? `${target.name} suspended.`
        : `${target.name} reactivated.`,
    );
  };

  const changeRole = async (role: string) => {
    const ok = await confirm({
      title: `Change ${target.name}'s role to ${role}?`,
      message: 'Their current sessions end and they will need to sign in again.',
      confirmLabel: 'Change role',
    });
    if (!ok) return;
    await run(
      () => api<User>(`/superadmin/users/${target._id}/role`, { method: 'PATCH', body: { role } }),
      `${target.name} is now ${role === ROLES.ADMIN ? 'an' : 'a'} ${role}.`,
    );
  };

  return (
    <div className="flex items-center justify-end gap-2 whitespace-nowrap">
      {can(PERMISSIONS.ROLE_CHANGE) && (
        <Select
          value={target.role}
          onChange={(e) => changeRole(e.target.value)}
          disabled={busy}
          className="w-32 py-1 text-xs"
          aria-label={`Role for ${target.name}`}
        >
          {ASSIGNABLE_ROLES.map((r) => (
            <option key={r} value={r}>
              {capitalize(r)}
            </option>
          ))}
        </Select>
      )}
      {target.status === USER_STATUS.SUSPENDED ? (
        <Button
          size="sm"
          variant="secondary"
          loading={busy}
          onClick={() => setStatus(USER_STATUS.ACTIVE)}
        >
          Reactivate
        </Button>
      ) : (
        <Button
          size="sm"
          variant="dangerGhost"
          loading={busy}
          onClick={() => setStatus(USER_STATUS.SUSPENDED)}
        >
          Suspend
        </Button>
      )}
    </div>
  );
}

interface Filters {
  role: string;
  status: string;
  search: string;
  page: number;
}

export default function AdminUsersPage() {
  const [filters, setFilters] = useState<Filters>({ role: '', status: '', search: '', page: 1 });
  const [searchText, setSearchText] = useState('');
  const state = useApiData<User[]>('/admin/users', { ...filters, limit: 15 });

  useEffect(() => {
    const t = setTimeout(
      () => setFilters((f) => ({ ...f, search: searchText.trim(), page: 1 })),
      350,
    );
    return () => clearTimeout(t);
  }, [searchText]);

  const setFilter = (key: 'role' | 'status') => (e: ChangeEvent<HTMLSelectElement>) =>
    setFilters((f) => ({ ...f, [key]: e.target.value, page: 1 }));
  const replaceUser = (updated: User) =>
    state.setData((list) => list.map((u) => (u._id === updated._id ? updated : u)));

  return (
    <>
      <PageHeader
        title="Users"
        description="Suspend, reactivate and manage accounts below your role."
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_10rem_10rem]">
        <Input
          type="search"
          placeholder="Search name, username or email…"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          aria-label="Search users"
        />
        <Select value={filters.role} onChange={setFilter('role')} aria-label="Role">
          <option value="">All roles</option>
          {Object.values(ROLES).map((r) => (
            <option key={r} value={r}>
              {capitalize(r)}
            </option>
          ))}
        </Select>
        <Select value={filters.status} onChange={setFilter('status')} aria-label="Status">
          <option value="">All statuses</option>
          {Object.values(USER_STATUS).map((s) => (
            <option key={s} value={s}>
              {capitalize(s)}
            </option>
          ))}
        </Select>
      </div>
      <AsyncView state={state} empty={<EmptyState title="No users match these filters" />}>
        {(users) => (
          <>
            <Table head={['User', 'Email', 'Role', 'Status', 'Joined', '']}>
              {users.map((u) => (
                <tr key={u._id}>
                  <Td>
                    <p className="font-medium text-slate-900">{u.name}</p>
                    <p className="text-xs text-slate-500">@{u.username}</p>
                  </Td>
                  <Td>{u.email}</Td>
                  <Td>
                    <StatusBadge status={u.role} />
                  </Td>
                  <Td>
                    <StatusBadge status={u.status} />
                  </Td>
                  <Td className="whitespace-nowrap">{formatDate(u.createdAt)}</Td>
                  <Td>
                    <UserActions target={u} onChanged={replaceUser} />
                  </Td>
                </tr>
              ))}
            </Table>
            <Pagination
              meta={state.meta}
              onPageChange={(page) => setFilters((f) => ({ ...f, page }))}
            />
          </>
        )}
      </AsyncView>
    </>
  );
}
