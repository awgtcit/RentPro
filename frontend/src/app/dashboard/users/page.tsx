'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { DataTable, PageHeader, Modal } from '@/components';
import toast from 'react-hot-toast';
import { Plus } from 'lucide-react';

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  roles: string[];
  [key: string]: unknown;
}

export default function UsersPage() {
  const [data, setData] = useState<{ items: User[]; total: number }>({ items: [], total: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState({ username: '', email: '', password: '', first_name: '', last_name: '', phone: '', role: 'Viewer' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get('/users', { params: { page, per_page: 25 } });
      setData(res);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ username: '', email: '', password: '', first_name: '', last_name: '', phone: '', role: 'Viewer' });
    setModalOpen(true);
  };

  const openEdit = (row: User) => {
    setEditing(row);
    setForm({
      username: row.username,
      email: row.email || '',
      password: '',
      first_name: row.first_name || '',
      last_name: row.last_name || '',
      phone: '',
      role: row.roles?.[0] || 'Viewer',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, unknown> = { ...form };
    if (editing && !payload.password) delete payload.password;
    try {
      if (editing) {
        await api.put(`/users/${editing.id}`, payload);
        toast.success('User updated');
      } else {
        await api.post('/users', payload);
        toast.success('User created');
      }
      setModalOpen(false);
      load();
    } catch {
      toast.error('Operation failed');
    }
  };

  const columns = [
    { key: 'username', label: 'Username' },
    { key: 'first_name', label: 'Name', render: (row: User) => `${row.first_name || ''} ${row.last_name || ''}`.trim() },
    { key: 'email', label: 'Email' },
    { key: 'roles', label: 'Role', render: (row: User) => <span className="badge-info">{row.roles?.[0] || '—'}</span> },
    { key: 'is_active', label: 'Status', render: (row: User) => <span className={row.is_active ? 'badge-success' : 'badge-gray'}>{row.is_active ? 'Active' : 'Inactive'}</span> },
  ];

  return (
    <div>
      <PageHeader title="Users" subtitle="Manage system users" actions={
        <button className="btn-primary" onClick={openCreate}><Plus className="mr-1.5 h-4 w-4" /> Add User</button>
      } />
      <div className="card p-0 overflow-hidden">
        <DataTable columns={columns} data={data.items} total={data.total} page={page} onPageChange={setPage} onRowClick={openEdit} loading={loading} />
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit User' : 'Add User'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Username *</label>
              <input className="input-field" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required disabled={!!editing} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Email *</label>
              <input type="email" className="input-field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">First Name</label>
              <input className="input-field" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Last Name</label>
              <input className="input-field" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{editing ? 'New Password' : 'Password *'}</label>
              <input type="password" className="input-field" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editing} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Role</label>
              <select className="input-field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="Admin">Admin</option>
                <option value="Manager">Manager</option>
                <option value="Cashier">Cashier</option>
                <option value="Viewer">Viewer</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary">{editing ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
