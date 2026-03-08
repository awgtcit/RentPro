'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { DataTable, PageHeader, Modal } from '@/components';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import { Plus, Search } from 'lucide-react';

interface Tenant {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string;
  nationality: string;
  id_type: string;
  id_number: string;
  id_expiry: string;
  is_active: boolean;
  created_at: string;
  [key: string]: unknown;
}

export default function TenantsPage() {
  const [data, setData] = useState<{ items: Tenant[]; total: number }>({ items: [], total: 0 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Tenant | null>(null);
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '', nationality: '',
    id_type: '', id_number: '', id_expiry: '', emergency_contact_name: '', emergency_contact_phone: '', date_of_birth: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, per_page: 25 };
      if (search) params.search = search;
      const { data: res } = await api.get('/tenants', { params });
      setData(res);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ first_name: '', last_name: '', email: '', phone: '', nationality: '', id_type: '', id_number: '', id_expiry: '', emergency_contact_name: '', emergency_contact_phone: '', date_of_birth: '' });
    setModalOpen(true);
  };

  const openEdit = (row: Tenant) => {
    setEditing(row);
    setForm({
      first_name: row.first_name, last_name: row.last_name, email: row.email || '', phone: row.phone || '',
      nationality: row.nationality || '', id_type: row.id_type || '', id_number: row.id_number || '',
      id_expiry: row.id_expiry || '', emergency_contact_name: '', emergency_contact_phone: '', date_of_birth: '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/tenants/${editing.id}`, form);
        toast.success('Tenant updated');
      } else {
        await api.post('/tenants', form);
        toast.success('Tenant created');
      }
      setModalOpen(false);
      load();
    } catch {
      toast.error('Operation failed');
    }
  };

  const columns = [
    { key: 'full_name', label: 'Name' },
    { key: 'phone', label: 'Phone' },
    { key: 'nationality', label: 'Nationality' },
    { key: 'id_type', label: 'ID Type' },
    { key: 'id_number', label: 'ID Number' },
    { key: 'id_expiry', label: 'ID Expiry', render: (row: Tenant) => formatDate(row.id_expiry) },
    {
      key: 'is_active', label: 'Status',
      render: (row: Tenant) => <span className={row.is_active ? 'badge-success' : 'badge-gray'}>{row.is_active ? 'Active' : 'Inactive'}</span>,
    },
  ];

  return (
    <div>
      <PageHeader title="Tenants" subtitle="Manage tenant profiles" actions={
        <button className="btn-primary" onClick={openCreate}><Plus className="mr-1.5 h-4 w-4" /> Add Tenant</button>
      } />

      <div className="mb-4 flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            className="input-field pl-9"
            placeholder="Search tenants..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <DataTable columns={columns} data={data.items} total={data.total} page={page} onPageChange={setPage} onRowClick={openEdit} loading={loading} />
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Tenant' : 'Add Tenant'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">First Name *</label>
              <input className="input-field" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Last Name *</label>
              <input className="input-field" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
              <input type="email" className="input-field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Phone</label>
              <input className="input-field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Nationality</label>
              <input className="input-field" value={form.nationality} onChange={(e) => setForm({ ...form, nationality: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">ID Type</label>
              <select className="input-field" value={form.id_type} onChange={(e) => setForm({ ...form, id_type: e.target.value })}>
                <option value="">Select</option>
                <option value="passport">Passport</option>
                <option value="national_id">National ID</option>
                <option value="residence_permit">Residence Permit</option>
                <option value="driving_license">Driving License</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">ID Number</label>
              <input className="input-field" value={form.id_number} onChange={(e) => setForm({ ...form, id_number: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">ID Expiry</label>
              <input type="date" className="input-field" value={form.id_expiry} onChange={(e) => setForm({ ...form, id_expiry: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Date of Birth</label>
              <input type="date" className="input-field" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Emergency Contact Name</label>
              <input className="input-field" value={form.emergency_contact_name} onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Emergency Contact Phone</label>
              <input className="input-field" value={form.emergency_contact_phone} onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })} />
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
