'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { PageHeader, DataTable } from '@/components';
import { formatDateTime } from '@/lib/utils';

interface AuditEntry {
  id: number;
  user_id: number;
  action: string;
  entity_type: string;
  entity_id: number;
  ip_address: string;
  created_at: string;
  [key: string]: unknown;
}

interface RoleItem {
  id: number;
  name: string;
  description: string;
  permissions: string[];
  [key: string]: unknown;
}

export default function SettingsPage() {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [auditData, setAuditData] = useState<{ items: AuditEntry[]; total: number }>({ items: [], total: 0 });
  const [auditPage, setAuditPage] = useState(1);
  const [tab, setTab] = useState<'roles' | 'audit'>('roles');

  useEffect(() => {
    api.get('/settings/roles').then(({ data }) => setRoles(data.items || data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (tab === 'audit') {
      api.get('/settings/audit-logs', { params: { page: auditPage, per_page: 25 } })
        .then(({ data }) => setAuditData(data))
        .catch(() => {});
    }
  }, [tab, auditPage]);

  const auditColumns = [
    { key: 'id', label: 'ID' },
    { key: 'action', label: 'Action', render: (row: AuditEntry) => <span className="font-mono text-xs">{row.action}</span> },
    { key: 'entity_type', label: 'Entity' },
    { key: 'entity_id', label: 'Entity ID' },
    { key: 'user_id', label: 'User' },
    { key: 'ip_address', label: 'IP' },
    { key: 'created_at', label: 'Time', render: (row: AuditEntry) => formatDateTime(row.created_at) },
  ];

  return (
    <div>
      <PageHeader title="Settings" subtitle="System configuration and audit trail" />

      <div className="mb-4 flex gap-2">
        <button className={tab === 'roles' ? 'btn-primary' : 'btn-secondary'} onClick={() => setTab('roles')}>
          Roles & Permissions
        </button>
        <button className={tab === 'audit' ? 'btn-primary' : 'btn-secondary'} onClick={() => setTab('audit')}>
          Audit Log
        </button>
      </div>

      {tab === 'roles' && (
        <div className="space-y-4">
          {roles.map((role) => (
            <div key={role.id} className="card">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900">{role.name}</h3>
                <span className="text-sm text-gray-500">{role.description}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {role.permissions?.map((p: string) => (
                  <span key={p} className="badge-info">{p}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'audit' && (
        <div className="card p-0 overflow-hidden">
          <DataTable
            columns={auditColumns}
            data={auditData.items}
            total={auditData.total}
            page={auditPage}
            onPageChange={setAuditPage}
          />
        </div>
      )}
    </div>
  );
}
