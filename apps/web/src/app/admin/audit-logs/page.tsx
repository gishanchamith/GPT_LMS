'use client';

import { useState } from 'react';
import { AUDIT_ACTIONS, type AuditAction } from '@lp/shared';
import { useApiData } from '@/hooks/useApiData';
import { formatDateTime } from '@/lib/format';
import type { AuditLogEntry } from '@/types/api';
import Pagination from '@/components/Pagination';
import { AsyncView, EmptyState } from '@/components/States';
import { Badge, PageHeader, Select, Table, Td, type BadgeTone } from '@/components/ui';

const ACTION_TONES: Partial<Record<AuditAction, BadgeTone>> = {
  USER_SUSPENDED: 'red',
  ADMIN_REMOVED: 'red',
  COURSE_DELETED: 'red',
  USER_REACTIVATED: 'green',
  INSTRUCTOR_APPROVED: 'green',
  ADMIN_CREATED: 'purple',
  ROLE_CHANGED: 'purple',
};

const label = (action: AuditAction) => action.toLowerCase().replace(/_/g, ' ');

function describe(log: AuditLogEntry): string {
  const m = log.metadata ?? {};
  const who = m.username ? `@${m.username}` : m.title ? `“${m.title}”` : (log.targetType ?? '—');
  if (m.from && m.to) return `${who}: ${m.from} → ${m.to}`;
  if (m.fields) return `${who}: ${m.fields.join(', ')}`;
  return who;
}

export default function AuditLogPage() {
  const [filters, setFilters] = useState({ action: '', page: 1 });
  const state = useApiData<AuditLogEntry[]>('/superadmin/audit-logs', { ...filters, limit: 20 });

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Every privileged action, who took it and when."
        actions={
          <Select
            value={filters.action}
            onChange={(e) => setFilters({ action: e.target.value, page: 1 })}
            className="w-56"
            aria-label="Filter by action"
          >
            <option value="">All actions</option>
            {Object.values(AUDIT_ACTIONS).map((a) => (
              <option key={a} value={a}>
                {label(a)}
              </option>
            ))}
          </Select>
        }
      />
      <AsyncView state={state} empty={<EmptyState title="No audit entries yet" />}>
        {(logs) => (
          <>
            <Table head={['When', 'Actor', 'Action', 'Target', 'IP']}>
              {logs.map((log) => (
                <tr key={log._id}>
                  <Td className="whitespace-nowrap">{formatDateTime(log.createdAt)}</Td>
                  <Td>
                    <p className="font-medium text-slate-900">
                      {log.actor?.name ?? 'Removed user'}
                    </p>
                    <p className="text-xs text-slate-500">@{log.actorUsername}</p>
                  </Td>
                  <Td>
                    <Badge tone={ACTION_TONES[log.action] ?? 'blue'}>{label(log.action)}</Badge>
                  </Td>
                  <Td>{describe(log)}</Td>
                  <Td className="text-xs text-slate-500">{log.ip ?? '—'}</Td>
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
