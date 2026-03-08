'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { DataTable, PageHeader, Modal } from '@/components';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';
import { Plus } from 'lucide-react';

interface Flat {
  id: number;
  building_id: number;
  building_name: string;
  flat_number: string;
  floor: number;
  flat_type: string;
  total_rooms: number;
  rent_amount: string;
  is_active: boolean;
  [key: string]: unknown;
}

interface Building {
  id: number;
  name: string;
}

export default function FlatsPage() {
  const [data, setData] = useState<{ items: Flat[]; total: number }>({ items: [], total: 0 });
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Flat | null>(null);
  const [form, setForm] = useState({ building_id: '', flat_number: '', floor: '', flat_type: '', total_rooms: '', rent_amount: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [flatsRes, buildingsRes] = await Promise.all([
        api.get('/flats', { params: { page, per_page: 25 } }),
        api.get('/buildings', { params: { per_page: 100 } }),
      ]);
      setData(flatsRes.data);
      setBuildings(buildingsRes.data.items || []);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ building_id: '', flat_number: '', floor: '', flat_type: '', total_rooms: '', rent_amount: '' });
    setModalOpen(true);
  };

  const openEdit = (row: Flat) => {
    setEditing(row);
    setForm({
      building_id: String(row.building_id),
      flat_number: row.flat_number,
      floor: String(row.floor || ''),
      flat_type: row.flat_type || '',
      total_rooms: String(row.total_rooms || ''),
      rent_amount: row.rent_amount || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      building_id: parseInt(form.building_id),
      flat_number: form.flat_number,
      floor: parseInt(form.floor) || 0,
      flat_type: form.flat_type,
      total_rooms: parseInt(form.total_rooms) || 0,
      rent_amount: Math.round(parseFloat(form.rent_amount) * 100) || 0,
    };
    try {
      if (editing) {
        await api.put(`/flats/${editing.id}`, payload);
        toast.success('Flat updated');
      } else {
        await api.post('/flats', payload);
        toast.success('Flat created');
      }
      setModalOpen(false);
      load();
    } catch {
      toast.error('Operation failed');
    }
  };

  const columns = [
    { key: 'building_name', label: 'Building' },
    { key: 'flat_number', label: 'Flat #' },
    { key: 'floor', label: 'Floor' },
    { key: 'flat_type', label: 'Type' },
    { key: 'total_rooms', label: 'Rooms' },
    { key: 'rent_amount', label: 'Rent', render: (row: Flat) => formatCurrency(row.rent_amount) },
    {
      key: 'is_active',
      label: 'Status',
      render: (row: Flat) => (
        <span className={row.is_active ? 'badge-success' : 'badge-gray'}>{row.is_active ? 'Active' : 'Inactive'}</span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Flats" subtitle="Manage flats within buildings" actions={
        <button className="btn-primary" onClick={openCreate}><Plus className="mr-1.5 h-4 w-4" /> Add Flat</button>
      } />
      <div className="card p-0 overflow-hidden">
        <DataTable columns={columns} data={data.items} total={data.total} page={page} onPageChange={setPage} onRowClick={openEdit} loading={loading} />
      </div>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Flat' : 'Add Flat'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Building *</label>
            <select className="input-field" value={form.building_id} onChange={(e) => setForm({ ...form, building_id: e.target.value })} required>
              <option value="">Select building</option>
              {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Flat Number *</label>
              <input className="input-field" value={form.flat_number} onChange={(e) => setForm({ ...form, flat_number: e.target.value })} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Floor</label>
              <input type="number" className="input-field" value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Type</label>
              <input className="input-field" value={form.flat_type} onChange={(e) => setForm({ ...form, flat_type: e.target.value })} placeholder="e.g. Studio, 1BHK" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Total Rooms</label>
              <input type="number" className="input-field" value={form.total_rooms} onChange={(e) => setForm({ ...form, total_rooms: e.target.value })} />
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
