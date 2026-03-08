'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { DataTable, PageHeader, Modal } from '@/components';
import toast from 'react-hot-toast';
import { Plus } from 'lucide-react';

interface Building {
  id: number;
  name: string;
  address: string;
  city: string;
  country: string;
  total_flats: number;
  is_active: boolean;
  created_at: string;
  [key: string]: unknown;
}

export default function BuildingsPage() {
  const [data, setData] = useState<{ items: Building[]; total: number }>({ items: [], total: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Building | null>(null);
  const [form, setForm] = useState({ name: '', address: '', city: '', country: '', total_flats: '', notes: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get('/buildings', { params: { page, per_page: 25 } });
      setData(res);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', address: '', city: '', country: '', total_flats: '', notes: '' });
    setModalOpen(true);
  };

  const openEdit = (row: Building) => {
    setEditing(row);
    setForm({
      name: row.name || '',
      address: row.address || '',
      city: row.city || '',
      country: row.country || '',
      total_flats: String(row.total_flats || ''),
      notes: '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, total_flats: parseInt(form.total_flats) || 0 };
    try {
      if (editing) {
        await api.put(`/buildings/${editing.id}`, payload);
        toast.success('Building updated');
      } else {
        await api.post('/buildings', payload);
        toast.success('Building created');
      }
      setModalOpen(false);
      load();
    } catch {
      toast.error('Operation failed');
    }
  };

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'address', label: 'Address' },
    { key: 'city', label: 'City' },
    { key: 'total_flats', label: 'Flats' },
    {
      key: 'is_active',
      label: 'Status',
      render: (row: Building) => (
        <span className={row.is_active ? 'badge-success' : 'badge-gray'}>
          {row.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Buildings"
        subtitle="Manage your properties"
        actions={
          <button className="btn-primary" onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" /> Add Building
          </button>
        }
      />
      <div className="card p-0 overflow-hidden">
        <DataTable
          columns={columns}
          data={data.items}
          total={data.total}
          page={page}
          onPageChange={setPage}
          onRowClick={openEdit}
          loading={loading}
          emptyMessage="No buildings yet"
        />
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Building' : 'Add Building'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Name *</label>
            <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Address</label>
              <input className="input-field" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">City</label>
              <input className="input-field" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Country</label>
              <input className="input-field" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Total Flats</label>
              <input type="number" className="input-field" value={form.total_flats} onChange={(e) => setForm({ ...form, total_flats: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
            <textarea className="input-field" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
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
