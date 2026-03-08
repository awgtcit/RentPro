'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { DataTable, PageHeader } from '@/components';
import { formatDate, formatCurrency, statusColor } from '@/lib/utils';
import toast from 'react-hot-toast';
import { FileText, Zap } from 'lucide-react';

interface Invoice {
  id: number;
  invoice_number: string;
  tenant_name: string;
  billing_period_start: string;
  billing_period_end: string;
  total_due: string;
  paid_amount: string;
  balance: string;
  status: string;
  due_date: string;
  [key: string]: unknown;
}

export default function InvoicesPage() {
  const [data, setData] = useState<{ items: Invoice[]; total: number }>({ items: [], total: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, per_page: 25 };
      if (statusFilter) params.status = statusFilter;
      const { data: res } = await api.get('/invoices', { params });
      setData(res);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const generateBatch = async () => {
    setGenerating(true);
    try {
      const { data: res } = await api.post('/invoices/generate-batch');
      toast.success(`Generated ${res.generated} invoice(s)`);
      load();
    } catch {
      toast.error('Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const columns = [
    { key: 'invoice_number', label: 'Invoice #', render: (row: Invoice) => <span className="font-mono text-xs">{row.invoice_number}</span> },
    { key: 'tenant_name', label: 'Tenant' },
    { key: 'billing_period_start', label: 'Period', render: (row: Invoice) => `${formatDate(row.billing_period_start)} - ${formatDate(row.billing_period_end)}` },
    { key: 'total_due', label: 'Total', render: (row: Invoice) => formatCurrency(row.total_due) },
    { key: 'paid_amount', label: 'Paid', render: (row: Invoice) => formatCurrency(row.paid_amount) },
    { key: 'balance', label: 'Balance', render: (row: Invoice) => <span className={parseFloat(row.balance) > 0 ? 'font-medium text-red-600' : 'text-emerald-600'}>{formatCurrency(row.balance)}</span> },
    { key: 'due_date', label: 'Due', render: (row: Invoice) => formatDate(row.due_date) },
    { key: 'status', label: 'Status', render: (row: Invoice) => <span className={statusColor(row.status)}>{row.status}</span> },
  ];

  return (
    <div>
      <PageHeader title="Invoices" subtitle="Manage rent invoices" actions={
        <button className="btn-primary" onClick={generateBatch} disabled={generating}>
          <Zap className="mr-1.5 h-4 w-4" /> {generating ? 'Generating...' : 'Generate Monthly'}
        </button>
      } />

      <div className="mb-4 flex gap-2">
        <select className="input-field max-w-xs" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        <DataTable columns={columns} data={data.items} total={data.total} page={page} onPageChange={setPage} loading={loading} emptyMessage="No invoices yet" />
      </div>
    </div>
  );
}
