'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { DataTable, PageHeader, Modal } from '@/components';
import { formatCurrency, statusColor, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import { Plus } from 'lucide-react';

interface MxRequest {
  id: number;
  building_id: number;
  flat_id: number;
  title: string;
  description: string;
  priority: string;
  status: string;
  cost: string;
  completed_at: string;
  created_at: string;
  [key: string]: unknown;
}

export default function MaintenancePage() {
  const [data, setData] = useState<{ items: MxRequest[]; total: number }>({ items: [], total: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MxRequest | null>(null);
  const [buildings, setBuildings] = useState<{ id: number; name: string }[]>([]);
  const [form, setForm] = useState({ building_id: '', flat_id: '', title: '', description: '', priority: 'medium', status: 'open', cost: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get('/maintenance', { params: { page, per_page: 25 } });
      setData(res);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const openCreate = async () => {
    setEditing(null);
    setForm({ building_id: '', flat_id: '', title: '', description: '', priority: 'medium', status: 'open', cost: '' });
    try {
      const { data: res } = await api.get('/buildings', { params: { per_page: 100 } });
      setBuildings(res.items || []);
    } catch { /* */ }
    setModalOpen(true);
  };

  const openEdit = (row: MxRequest) => {
    setEditing(row);
    setForm({
      building_id: String(row.building_id || ''),
      flat_id: String(row.flat_id || ''),
      title: row.title,
      description: row.description || '',
      priority: row.priority,
      status: row.status,
      cost: row.cost || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, unknown> = {
      building_id: parseInt(form.building_id),
      title: form.title,
      description: form.description,
      priority: form.priority,
      status: form.status,
    };
    if (form.flat_id) payload.flat_id = parseInt(form.flat_id);
    if (form.cost) payload.cost = Math.round(parseFloat(form.cost) * 100);
    try {
      if (editing) {
        await api.put(`/maintenance/${editing.id}`, payload);
        toast.success('Updated');
      } else {
        await api.post('/maintenance', payload);
        toast.success('Created');
      }
      setModalOpen(false);
      load();
    } catch {
      toast.error('Operation failed');
    }
  };

  const priorityColor = (p: string) => {
    const m: Record<string, string> = { low: 'badge-gray', medium: 'badge-info', high: 'badge-warning', urgent: 'badge-danger' };
    return m[p] || 'badge-gray';
  };

  const columns = [
    { key: 'title', label: 'Title' },
    { key: 'priority', label: 'Priority', render: (row: MxRequest) => <span className={priorityColor(row.priority)}>{row.priority}</span> },
    { key: 'status', label: 'Status', render: (row: MxRequest) => <span className={statusColor(row.status)}>{row.status}</span> },
    { key: 'cost', label: 'Cost', render: (row: MxRequest) => row.cost ? formatCurrency(row.cost) : '—' },
    { key: 'created_at', label: 'Reported', render: (row: MxRequest) => formatDate(row.created_at) },
    { key: 'completed_at', label: 'Completed', render: (row: MxRequest) => formatDate(row.completed_at) },
  ];

  return (
    <div>
      <PageHeader title="Maintenance" subtitle="Track maintenance requests" actions={
        <button className="btn-primary" onClick={openCreate}><Plus className="mr-1.5 h-4 w-4" /> New Request</button>
      } />
      <div className="card p-0 overflow-hidden">
        <DataTable columns={columns} data={data.items} total={data.total} page={page} onPageChange={setPage} onRowClick={openEdit} loading={loading} />
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Request' : 'New Request'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Building *</label>
            <select className="input-field" value={form.building_id} onChange={(e) => setForm({ ...form, building_id: e.target.value })} required>
              <option value="">Select</option>
              {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Title *</label>
            <input className="input-field" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
            <textarea className="input-field" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Priority</label>
              <select className="input-field" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
              <select className="input-field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Cost</label>
              <input type="number" step="0.01" className="input-field" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
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
