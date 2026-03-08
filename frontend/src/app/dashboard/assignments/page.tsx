'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { DataTable, PageHeader, Modal } from '@/components';
import { formatDate, formatCurrency, statusColor } from '@/lib/utils';
import toast from 'react-hot-toast';
import { Plus } from 'lucide-react';

interface Assignment {
  id: number;
  tenant_name: string;
  assignment_type: string;
  unit_label: string;
  start_date: string;
  end_date: string;
  rent_amount: string;
  status: string;
  [key: string]: unknown;
}

interface Tenant { id: number; full_name: string; }
interface Building { id: number; name: string; }
interface Flat { id: number; flat_number: string; building_id: number; }
interface Room { id: number; room_number: string; flat_id: number; }
interface Bedspace { id: number; bedspace_code: string; room_id: number; }

export default function AssignmentsPage() {
  const [data, setData] = useState<{ items: Assignment[]; total: number }>({ items: [], total: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [flats, setFlats] = useState<Flat[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bedspaces, setBedspaces] = useState<Bedspace[]>([]);
  const [form, setForm] = useState({
    tenant_id: '', assignment_type: 'room', building_id: '', flat_id: '', room_id: '', bedspace_id: '',
    start_date: '', end_date: '', rent_amount: '', deposit_amount: '', billing_cycle: 'monthly', billing_day: '1',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get('/assignments', { params: { page, per_page: 25 } });
      setData(res);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const openCreate = async () => {
    setForm({ tenant_id: '', assignment_type: 'room', building_id: '', flat_id: '', room_id: '', bedspace_id: '', start_date: '', end_date: '', rent_amount: '', deposit_amount: '', billing_cycle: 'monthly', billing_day: '1' });
    try {
      const [tRes, bRes, fRes, rRes, bsRes] = await Promise.all([
        api.get('/tenants', { params: { per_page: 500 } }),
        api.get('/buildings', { params: { per_page: 100 } }),
        api.get('/flats', { params: { per_page: 500 } }),
        api.get('/rooms', { params: { per_page: 500 } }),
        api.get('/bedspaces', { params: { per_page: 1000 } }),
      ]);
      setTenants(tRes.data.items || []);
      setBuildings(bRes.data.items || []);
      setFlats(fRes.data.items || []);
      setRooms(rRes.data.items || []);
      setBedspaces(bsRes.data.items || []);
    } catch { /* ignore */ }
    setModalOpen(true);
  };

  const endAssignment = async (id: number) => {
    if (!confirm('End this assignment?')) return;
    try {
      await api.post(`/assignments/${id}/end`);
      toast.success('Assignment ended');
      load();
    } catch {
      toast.error('Failed to end assignment');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      tenant_id: parseInt(form.tenant_id),
      building_id: parseInt(form.building_id),
      flat_id: form.flat_id ? parseInt(form.flat_id) : null,
      room_id: form.room_id ? parseInt(form.room_id) : null,
      bedspace_id: form.bedspace_id ? parseInt(form.bedspace_id) : null,
      rent_amount: Math.round(parseFloat(form.rent_amount) * 100) || 0,
      deposit_amount: Math.round(parseFloat(form.deposit_amount) * 100) || 0,
      billing_day: parseInt(form.billing_day) || 1,
    };
    try {
      await api.post('/assignments', payload);
      toast.success('Assignment created');
      setModalOpen(false);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed';
      toast.error(msg);
    }
  };

  const filteredFlats = flats.filter(f => !form.building_id || f.building_id === parseInt(form.building_id));
  const filteredRooms = rooms.filter(r => !form.flat_id || r.flat_id === parseInt(form.flat_id));
  const filteredBedspaces = bedspaces.filter(b => !form.room_id || b.room_id === parseInt(form.room_id));

  const columns = [
    { key: 'tenant_name', label: 'Tenant' },
    { key: 'assignment_type', label: 'Type', render: (row: Assignment) => <span className="badge-info">{row.assignment_type}</span> },
    { key: 'unit_label', label: 'Unit' },
    { key: 'start_date', label: 'Start', render: (row: Assignment) => formatDate(row.start_date) },
    { key: 'end_date', label: 'End', render: (row: Assignment) => formatDate(row.end_date) },
    { key: 'rent_amount', label: 'Rent', render: (row: Assignment) => formatCurrency(row.rent_amount) },
    { key: 'status', label: 'Status', render: (row: Assignment) => <span className={statusColor(row.status)}>{row.status}</span> },
    {
      key: 'actions', label: '', render: (row: Assignment) =>
        row.status === 'active' ? (
          <button className="text-xs text-red-600 hover:underline" onClick={(e) => { e.stopPropagation(); endAssignment(row.id); }}>End</button>
        ) : null,
    },
  ];

  return (
    <div>
      <PageHeader title="Assignments" subtitle="Tenant unit assignments" actions={
        <button className="btn-primary" onClick={openCreate}><Plus className="mr-1.5 h-4 w-4" /> New Assignment</button>
      } />
      <div className="card p-0 overflow-hidden">
        <DataTable columns={columns} data={data.items} total={data.total} page={page} onPageChange={setPage} loading={loading} />
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Assignment" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Tenant *</label>
              <select className="input-field" value={form.tenant_id} onChange={(e) => setForm({ ...form, tenant_id: e.target.value })} required>
                <option value="">Select tenant</option>
                {tenants.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Assignment Type *</label>
              <select className="input-field" value={form.assignment_type} onChange={(e) => setForm({ ...form, assignment_type: e.target.value })}>
                <option value="flat">Flat</option>
                <option value="room">Room</option>
                <option value="bedspace">Bedspace</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Building *</label>
              <select className="input-field" value={form.building_id} onChange={(e) => setForm({ ...form, building_id: e.target.value, flat_id: '', room_id: '', bedspace_id: '' })} required>
                <option value="">Select building</option>
                {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Flat *</label>
              <select className="input-field" value={form.flat_id} onChange={(e) => setForm({ ...form, flat_id: e.target.value, room_id: '', bedspace_id: '' })} required>
                <option value="">Select flat</option>
                {filteredFlats.map(f => <option key={f.id} value={f.id}>{f.flat_number}</option>)}
              </select>
            </div>
          </div>
          {(form.assignment_type === 'room' || form.assignment_type === 'bedspace') && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Room {form.assignment_type !== 'flat' ? '*' : ''}</label>
                <select className="input-field" value={form.room_id} onChange={(e) => setForm({ ...form, room_id: e.target.value, bedspace_id: '' })}>
                  <option value="">Select room</option>
                  {filteredRooms.map(r => <option key={r.id} value={r.id}>{r.room_number}</option>)}
                </select>
              </div>
              {form.assignment_type === 'bedspace' && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Bedspace *</label>
                  <select className="input-field" value={form.bedspace_id} onChange={(e) => setForm({ ...form, bedspace_id: e.target.value })}>
                    <option value="">Select bedspace</option>
                    {filteredBedspaces.map(b => <option key={b.id} value={b.id}>{b.bedspace_code}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Start Date *</label>
              <input type="date" className="input-field" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">End Date</label>
              <input type="date" className="input-field" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Rent *</label>
              <input type="number" step="0.01" className="input-field" value={form.rent_amount} onChange={(e) => setForm({ ...form, rent_amount: e.target.value })} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Deposit</label>
              <input type="number" step="0.01" className="input-field" value={form.deposit_amount} onChange={(e) => setForm({ ...form, deposit_amount: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Billing Cycle</label>
              <select className="input-field" value={form.billing_cycle} onChange={(e) => setForm({ ...form, billing_cycle: e.target.value })}>
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Billing Day</label>
              <input type="number" min="1" max="28" className="input-field" value={form.billing_day} onChange={(e) => setForm({ ...form, billing_day: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary">Create Assignment</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
