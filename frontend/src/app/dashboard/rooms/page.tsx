'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { DataTable, PageHeader, Modal } from '@/components';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';
import { Plus } from 'lucide-react';

interface Room {
  id: number;
  flat_id: number;
  flat_number: string;
  room_number: string;
  room_type: string;
  capacity: number;
  rent_amount: string;
  is_active: boolean;
  [key: string]: unknown;
}

export default function RoomsPage() {
  const [data, setData] = useState<{ items: Room[]; total: number }>({ items: [], total: 0 });
  const [flats, setFlats] = useState<{ id: number; flat_number: string }[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Room | null>(null);
  const [form, setForm] = useState({ flat_id: '', room_number: '', room_type: '', capacity: '', rent_amount: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [roomsRes, flatsRes] = await Promise.all([
        api.get('/rooms', { params: { page, per_page: 25 } }),
        api.get('/flats', { params: { per_page: 200 } }),
      ]);
      setData(roomsRes.data);
      setFlats(flatsRes.data.items || []);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ flat_id: '', room_number: '', room_type: '', capacity: '', rent_amount: '' });
    setModalOpen(true);
  };

  const openEdit = (row: Room) => {
    setEditing(row);
    setForm({
      flat_id: String(row.flat_id),
      room_number: row.room_number,
      room_type: row.room_type || '',
      capacity: String(row.capacity || 1),
      rent_amount: row.rent_amount || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      flat_id: parseInt(form.flat_id),
      room_number: form.room_number,
      room_type: form.room_type,
      capacity: parseInt(form.capacity) || 1,
      rent_amount: Math.round(parseFloat(form.rent_amount) * 100) || 0,
    };
    try {
      if (editing) {
        await api.put(`/rooms/${editing.id}`, payload);
        toast.success('Room updated');
      } else {
        await api.post('/rooms', payload);
        toast.success('Room created');
      }
      setModalOpen(false);
      load();
    } catch {
      toast.error('Operation failed');
    }
  };

  const columns = [
    { key: 'flat_number', label: 'Flat' },
    { key: 'room_number', label: 'Room #' },
    { key: 'room_type', label: 'Type' },
    { key: 'capacity', label: 'Capacity' },
    { key: 'rent_amount', label: 'Rent', render: (row: Room) => formatCurrency(row.rent_amount) },
    {
      key: 'is_active', label: 'Status',
      render: (row: Room) => <span className={row.is_active ? 'badge-success' : 'badge-gray'}>{row.is_active ? 'Active' : 'Inactive'}</span>,
    },
  ];

  return (
    <div>
      <PageHeader title="Rooms" subtitle="Manage rooms within flats" actions={
        <button className="btn-primary" onClick={openCreate}><Plus className="mr-1.5 h-4 w-4" /> Add Room</button>
      } />
      <div className="card p-0 overflow-hidden">
        <DataTable columns={columns} data={data.items} total={data.total} page={page} onPageChange={setPage} onRowClick={openEdit} loading={loading} />
      </div>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Room' : 'Add Room'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Flat *</label>
            <select className="input-field" value={form.flat_id} onChange={(e) => setForm({ ...form, flat_id: e.target.value })} required>
              <option value="">Select flat</option>
              {flats.map((f) => <option key={f.id} value={f.id}>{f.flat_number}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Room Number *</label>
              <input className="input-field" value={form.room_number} onChange={(e) => setForm({ ...form, room_number: e.target.value })} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Type</label>
              <input className="input-field" value={form.room_type} onChange={(e) => setForm({ ...form, room_type: e.target.value })} placeholder="e.g. Single, Double" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Capacity</label>
              <input type="number" min="1" className="input-field" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Rent Amount</label>
            <input type="number" step="0.01" className="input-field" value={form.rent_amount} onChange={(e) => setForm({ ...form, rent_amount: e.target.value })} />
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
