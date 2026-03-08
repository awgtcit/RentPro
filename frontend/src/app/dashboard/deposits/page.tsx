'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { DataTable, PageHeader, Modal } from '@/components';
import { formatCurrency, statusColor } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Deposit {
  id: number;
  tenant_id: number;
  assignment_id: number;
  amount: string;
  balance: string;
  status: string;
  transactions: { id: number; transaction_type: string; amount: string; reason: string; created_at: string }[];
  [key: string]: unknown;
}

export default function DepositsPage() {
  const [data, setData] = useState<{ items: Deposit[]; total: number }>({ items: [], total: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<Deposit | null>(null);
  const [action, setAction] = useState<'deduct' | 'refund'>('deduct');
  const [form, setForm] = useState({ amount: '', reason: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get('/deposits', { params: { page, per_page: 25 } });
      setData(res);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const openAction = (row: Deposit, act: 'deduct' | 'refund') => {
    setSelected(row);
    setAction(act);
    setForm({ amount: '', reason: '' });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    try {
      await api.post(`/deposits/${selected.id}/${action}`, {
        amount: Math.round(parseFloat(form.amount) * 100),
        reason: form.reason,
      });
      toast.success(`Deposit ${action}ed`);
      setModalOpen(false);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed';
      toast.error(msg);
    }
  };

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'tenant_id', label: 'Tenant ID' },
    { key: 'assignment_id', label: 'Assignment ID' },
    { key: 'amount', label: 'Original', render: (row: Deposit) => formatCurrency(row.amount) },
    { key: 'balance', label: 'Balance', render: (row: Deposit) => <span className="font-medium">{formatCurrency(row.balance)}</span> },
    { key: 'status', label: 'Status', render: (row: Deposit) => <span className={statusColor(row.status)}>{row.status}</span> },
    {
      key: 'actions', label: '',
      render: (row: Deposit) => row.status === 'held' || row.status === 'partially_refunded' ? (
        <div className="flex gap-2">
          <button className="text-xs text-amber-600 hover:underline" onClick={(e) => { e.stopPropagation(); openAction(row, 'deduct'); }}>Deduct</button>
          <button className="text-xs text-primary-600 hover:underline" onClick={(e) => { e.stopPropagation(); openAction(row, 'refund'); }}>Refund</button>
        </div>
      ) : null,
    },
  ];

  return (
    <div>
      <PageHeader title="Deposits" subtitle="Manage security deposits" />
      <div className="card p-0 overflow-hidden">
        <DataTable columns={columns} data={data.items} total={data.total} page={page} onPageChange={setPage} loading={loading} />
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={action === 'deduct' ? 'Deduct from Deposit' : 'Refund Deposit'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-gray-500">Current balance: {selected && formatCurrency(selected.balance)}</p>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Amount *</label>
            <input type="number" step="0.01" className="input-field" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Reason *</label>
            <textarea className="input-field" rows={2} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} required />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className={action === 'deduct' ? 'btn-danger' : 'btn-primary'}>
              {action === 'deduct' ? 'Deduct' : 'Refund'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
