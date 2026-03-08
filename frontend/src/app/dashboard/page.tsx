'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { StatsCard } from '@/components/stats-card';
import { PageHeader } from '@/components/page-header';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Building2,
  Users,
  CreditCard,
  AlertTriangle,
  DoorOpen,
  BedDouble,
  TrendingUp,
  Percent,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardStats {
  total_buildings: number;
  total_flats: number;
  occupied_flats: number;
  vacant_flats: number;
  total_rooms: number;
  occupied_rooms: number;
  vacant_rooms: number;
  total_bedspaces: number;
  occupied_bedspaces: number;
  vacant_bedspaces: number;
  active_tenants: number;
  total_invoices_due: number;
  total_outstanding: number;
  total_collected_this_month: number;
  overdue_invoices: number;
  occupancy_rate: number;
  active_maintenance: number;
}

interface OverdueTenant {
  tenant_id: number;
  tenant_name: string;
  overdue_count: number;
  total_overdue: number;
  oldest_due_date: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [overdue, setOverdue] = useState<OverdueTenant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, overdueRes] = await Promise.all([
          api.get('/dashboard'),
          api.get('/reports/overdue-tenants'),
        ]);
        setStats(statsRes.data);
        setOverdue(overdueRes.data);
      } catch {
        // handled by interceptor
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading || !stats) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  const occupancyData = [
    { name: 'Flats', occupied: stats.occupied_flats, vacant: stats.vacant_flats },
    { name: 'Rooms', occupied: stats.occupied_rooms, vacant: stats.vacant_rooms },
    { name: 'Bedspaces', occupied: stats.occupied_bedspaces, vacant: stats.vacant_bedspaces },
  ];

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Overview of your rental portfolio" />

      {/* Stats Grid */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Buildings" value={stats.total_buildings} icon={Building2} />
        <StatsCard title="Active Tenants" value={stats.active_tenants} icon={Users} iconColor="text-emerald-600 bg-emerald-100" />
        <StatsCard
          title="Collected This Month"
          value={formatCurrency(stats.total_collected_this_month)}
          icon={CreditCard}
          iconColor="text-emerald-600 bg-emerald-100"
        />
        <StatsCard
          title="Outstanding Balance"
          value={formatCurrency(stats.total_outstanding)}
          icon={TrendingUp}
          iconColor="text-amber-600 bg-amber-100"
        />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Flats" value={`${stats.occupied_flats}/${stats.total_flats}`} subtitle="occupied" icon={DoorOpen} />
        <StatsCard title="Rooms" value={`${stats.occupied_rooms}/${stats.total_rooms}`} subtitle="occupied" icon={BedDouble} />
        <StatsCard title="Bedspaces" value={`${stats.occupied_bedspaces}/${stats.total_bedspaces}`} subtitle="occupied" icon={BedDouble} />
        <StatsCard
          title="Occupancy Rate"
          value={`${stats.occupancy_rate}%`}
          icon={Percent}
          iconColor={stats.occupancy_rate > 80 ? 'text-emerald-600 bg-emerald-100' : 'text-amber-600 bg-amber-100'}
        />
      </div>

      {/* Charts + Overdue */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Occupancy Chart */}
        <div className="card">
          <h3 className="mb-4 text-base font-semibold text-gray-900">Occupancy Overview</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={occupancyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="occupied" fill="#10b981" name="Occupied" radius={[4, 4, 0, 0]} />
              <Bar dataKey="vacant" fill="#e5e7eb" name="Vacant" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Overdue Tenants */}
        <div className="card">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <h3 className="text-base font-semibold text-gray-900">Overdue Tenants</h3>
            <span className="badge-danger">{stats.overdue_invoices}</span>
          </div>
          {overdue.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No overdue tenants</p>
          ) : (
            <div className="space-y-3 max-h-[220px] overflow-y-auto">
              {overdue.slice(0, 10).map((t) => (
                <div key={t.tenant_id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{t.tenant_name}</p>
                    <p className="text-xs text-gray-500">
                      {t.overdue_count} invoice(s) &middot; Due since {formatDate(t.oldest_due_date)}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-red-600">{formatCurrency(t.total_overdue)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
