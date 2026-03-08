'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { DataTable, PageHeader, Modal } from '@/components';
import { formatDate, formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';
import { Plus } from 'lucide-react';

interface Payment {
  id: number;
  receipt_number: string;
  tenant_name: string;
  payment_date: string;
  amount: string;
  payment_method: string;
  collected_by: number;
  [key: string]: unknown;
}

interface Tenant { id: number; full_name: string; }

export default function PaymentsPage() {
  const [data, setData] = useState<{ items: Payment[]; total: number }>({ items: [], total: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [form, setForm] = useState({
    tenant_id: '', amount: '', payment_method: 'cash', payment_date: '', reference_number: '', remarks: '', invoice_ids: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get('/payments', { params: { page, per_page: 25 } });
      setData(res);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const openCreate = async () => {
    setForm({ tenant_id: '', amount: '', payment_method: 'cash', payment_date: '', reference_number: '', remarks: '', invoice_ids: '' });
    try {
      const { data: res } = await api.get('/tenants', { params: { per_page: 500 } });
      setTenants(res.items || []);
    } catch { /* */ }
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, unknown> = {
      tenant_id: parseInt(form.tenant_id),
      amount: Math.round(parseFloat(form.amount) * 100),
      payment_method: form.payment_method,
      reference_number: form.reference_number || undefined,
      remarks: form.remarks || undefined,
    };
    if (form.payment_date) payload.payment_date = form.payment_date;
    if (form.invoice_ids) {
      payload.invoice_ids = form.invoice_ids.split(',').map((s: string) => parseInt(s.trim())).filter(Boolean);
    }
    try {
      await api.post('/payments', payload);
      toast.success('Payment collected');
      setModalOpen(false);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed';
      toast.error(msg);
    }
  };

  const columns = [
    { key: 'receipt_number', label: 'Receipt #', render: (row: Payment) => <span className="font-mono text-xs">{row.receipt_number}</span> },
    { key: 'tenant_name', label: 'Tenant' },
    { key: 'payment_date', label: 'Date', render: (row: Payment) => formatDate(row.payment_date) },
    { key: 'amount', label: 'Amount', render: (row: Payment) => <span className="font-medium text-emerald-600">{formatCurrency(row.amount)}</span> },
    { key: 'payment_method', label: 'Method', render: (row: Payment) => <span className="badge-info">{row.payment_method}</span> },
  ];

  return (
    <div>
      <PageHeader title="Payments" subtitle="Collect and track payments" actions={
        <button className="btn-success" onClick={openCreate}><Plus className="mr-1.5 h-4 w-4" /> Collect Payment</button>
      } />
      <div className="card p-0 overflow-hidden">
        <DataTable columns={columns} data={data.items} total={data.total} page={page} onPageChange={setPage} loading={loading} />
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Collect Payment" size="lg">
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
              <label className="mb-1 block text-sm font-medium text-gray-700">Amount *</label>
              <input type="number" step="0.01" className="input-field" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Payment Method</label>
              <select className="input-field" value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
                <option value="card">Card</option>
                <option value="online">Online</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Payment Date</label>
              <input type="date" className="input-field" value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Reference #</label>
              <input className="input-field" value={form.reference_number} onChange={(e) => setForm({ ...form, reference_number: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Invoice IDs (comma-separated, optional)</label>
            <input className="input-field" value={form.invoice_ids} onChange={(e) => setForm({ ...form, invoice_ids: e.target.value })} placeholder="e.g. 1,2,3" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Remarks</label>
            <textarea className="input-field" rows={2} value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-success">Collect Payment</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
