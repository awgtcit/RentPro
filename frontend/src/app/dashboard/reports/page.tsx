'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { PageHeader, StatsCard } from '@/components';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Building2, DoorOpen, BedDouble, Percent } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';

interface OccupancyData {
  total_flats: number;
  occupied_flats: number;
  vacant_flats: number;
  total_rooms: number;
  occupied_rooms: number;
  vacant_rooms: number;
  total_bedspaces: number;
  occupied_bedspaces: number;
  vacant_bedspaces: number;
  occupancy_rate: number;
}

interface OverdueTenant {
  tenant_id: number;
  tenant_name: string;
  overdue_count: number;
  total_overdue: number;
  oldest_due_date: string;
}

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6'];

export default function ReportsPage() {
  const [occupancy, setOccupancy] = useState<OccupancyData | null>(null);
  const [overdue, setOverdue] = useState<OverdueTenant[]>([]);
  const [daily, setDaily] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [occRes, ovRes, dailyRes] = await Promise.all([
          api.get('/reports/occupancy'),
          api.get('/reports/overdue-tenants'),
          api.get('/reports/daily-collection'),
        ]);
        setOccupancy(occRes.data);
        setOverdue(ovRes.data);
        setDaily(dailyRes.data);
      } catch { /* */ } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading || !occupancy) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  const pieData = [
    { name: 'Occupied', value: occupancy.occupied_flats + occupancy.occupied_rooms + occupancy.occupied_bedspaces },
    { name: 'Vacant', value: occupancy.vacant_flats + occupancy.vacant_rooms + occupancy.vacant_bedspaces },
  ];

  const barData = [
    { name: 'Flats', Occupied: occupancy.occupied_flats, Vacant: occupancy.vacant_flats },
    { name: 'Rooms', Occupied: occupancy.occupied_rooms, Vacant: occupancy.vacant_rooms },
    { name: 'Bedspaces', Occupied: occupancy.occupied_bedspaces, Vacant: occupancy.vacant_bedspaces },
  ];

  return (
    <div>
      <PageHeader title="Reports" subtitle="Financial and occupancy analytics" />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Flats" value={occupancy.total_flats} icon={DoorOpen} />
        <StatsCard title="Total Rooms" value={occupancy.total_rooms} icon={BedDouble} />
        <StatsCard title="Total Bedspaces" value={occupancy.total_bedspaces} icon={BedDouble} />
        <StatsCard title="Occupancy Rate" value={`${occupancy.occupancy_rate}%`} icon={Percent} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card">
          <h3 className="mb-4 text-base font-semibold text-gray-900">Occupancy by Type</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="Occupied" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Vacant" fill="#e5e7eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="mb-4 text-base font-semibold text-gray-900">Overall Occupancy</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label>
                {pieData.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx]} />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Daily Collection */}
      {daily && (
        <div className="mb-6 card">
          <h3 className="mb-2 text-base font-semibold text-gray-900">Daily Collection</h3>
          <p className="text-2xl font-bold text-emerald-600">{formatCurrency(daily.total_collected as string)}</p>
          <p className="text-sm text-gray-500">{daily.payment_count as number} payment(s) today</p>
        </div>
      )}

      {/* Overdue Tenants */}
      <div className="card">
        <h3 className="mb-4 text-base font-semibold text-gray-900">Overdue Tenants</h3>
        {overdue.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-400">No overdue tenants</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Tenant</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Invoices</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Total Overdue</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Oldest Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {overdue.map((t) => (
                  <tr key={t.tenant_id}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{t.tenant_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{t.overdue_count}</td>
                    <td className="px-4 py-3 text-sm font-medium text-red-600">{formatCurrency(t.total_overdue)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{formatDate(t.oldest_due_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
