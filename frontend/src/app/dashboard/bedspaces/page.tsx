'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { DataTable, PageHeader, Modal } from '@/components';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';
import { Plus } from 'lucide-react';

interface Bedspace {
  id: number;
  room_id: number;
  room_number: string;
  flat_id: number;
  flat_number: string;
  bedspace_code: string;
  rent_amount: string;
  is_active: boolean;
  [key: string]: unknown;
}

export default function BedspacesPage() {
  const [data, setData] = useState<{ items: Bedspace[]; total: number }>({ items: [], total: 0 });
  const [rooms, setRooms] = useState<{ id: number; room_number: string }[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Bedspace | null>(null);
  const [form, setForm] = useState({ room_id: '', bedspace_code: '', rent_amount: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [bRes, rRes] = await Promise.all([
        api.get('/bedspaces', { params: { page, per_page: 25 } }),
        api.get('/rooms', { params: { per_page: 500 } }),
      ]);
      setData(bRes.data);
      setRooms(rRes.data.items || []);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm({ room_id: '', bedspace_code: '', rent_amount: '' }); setModalOpen(true); };
  const openEdit = (row: Bedspace) => {
    setEditing(row);
    setForm({ room_id: String(row.room_id), bedspace_code: row.bedspace_code, rent_amount: row.rent_amount || '' });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { room_id: parseInt(form.room_id), bedspace_code: form.bedspace_code, rent_amount: Math.round(parseFloat(form.rent_amount) * 100) || 0 };
    try {
      if (editing) { await api.put(`/bedspaces/${editing.id}`, payload); toast.success('Bedspace updated'); }
      else { await api.post('/bedspaces', payload); toast.success('Bedspace created'); }
      setModalOpen(false); load();
    } catch { toast.error('Operation failed'); }
  };

  const columns = [
    { key: 'flat_number', label: 'Flat' },
    { key: 'room_number', label: 'Room' },
    { key: 'bedspace_code', label: 'Bedspace Code' },
    { key: 'rent_amount', label: 'Rent', render: (row: Bedspace) => formatCurrency(row.rent_amount) },
    { key: 'is_active', label: 'Status', render: (row: Bedspace) => <span className={row.is_active ? 'badge-success' : 'badge-gray'}>{row.is_active ? 'Active' : 'Inactive'}</span> },
  ];

  return (
    <div>
      <PageHeader title="Bedspaces" subtitle="Manage bedspaces within rooms" actions={
        <button className="btn-primary" onClick={openCreate}><Plus className="mr-1.5 h-4 w-4" /> Add Bedspace</button>
      } />
      <div className="card p-0 overflow-hidden">
        <DataTable columns={columns} data={data.items} total={data.total} page={page} onPageChange={setPage} onRowClick={openEdit} loading={loading} />
      </div>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Bedspace' : 'Add Bedspace'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Room *</label>
            <select className="input-field" value={form.room_id} onChange={(e) => setForm({ ...form, room_id: e.target.value })} required>
              <option value="">Select room</option>
              {rooms.map((r) => <option key={r.id} value={r.id}>{r.room_number}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Bedspace Code *</label>
              <input className="input-field" value={form.bedspace_code} onChange={(e) => setForm({ ...form, bedspace_code: e.target.value })} required placeholder="e.g. A, B, C" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Rent Amount</label>
              <input type="number" step="0.01" className="input-field" value={form.rent_amount} onChange={(e) => setForm({ ...form, rent_amount: e.target.value })} />
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
