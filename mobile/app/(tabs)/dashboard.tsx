import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { StatCard } from '@/components/StatCard';
import { formatCurrency } from '@/lib/utils';
import { colors, spacing, fontSize, borderRadius } from '@/lib/theme';

interface DashboardData {
  total_buildings: number;
  total_tenants: number;
  collected_rent: number;
  overdue_rent: number;
  occupied_flats: number;
  total_flats: number;
  occupied_rooms: number;
  total_rooms: number;
  occupied_bedspaces: number;
  total_bedspaces: number;
  occupancy_rate: number;
  overdue_tenants?: Array<{ tenant_name: string; total_overdue: string }>;
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/dashboard');
      setData(res.data);
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Welcome */}
      <View style={styles.welcomeCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.first_name?.charAt(0)}{user?.last_name?.charAt(0)}
          </Text>
        </View>
        <View>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.first_name} {user?.last_name}</Text>
        </View>
      </View>

      {/* Stats Row 1 */}
      <View style={styles.statsRow}>
        <StatCard
          title="Buildings"
          value={data?.total_buildings ?? 0}
          color={colors.primary}
          icon={<Ionicons name="business" size={22} color={colors.primary} />}
          style={styles.statHalf}
        />
        <StatCard
          title="Active Tenants"
          value={data?.total_tenants ?? 0}
          color={colors.secondary}
          icon={<Ionicons name="people" size={22} color={colors.secondary} />}
          style={styles.statHalf}
        />
      </View>

      {/* Stats Row 2 */}
      <View style={styles.statsRow}>
        <StatCard
          title="Collected"
          value={formatCurrency(data?.collected_rent)}
          color={colors.success}
          icon={<Ionicons name="cash" size={22} color={colors.success} />}
          style={styles.statHalf}
        />
        <StatCard
          title="Outstanding"
          value={formatCurrency(data?.overdue_rent)}
          color={colors.warning}
          icon={<Ionicons name="alert-circle" size={22} color={colors.warning} />}
          style={styles.statHalf}
        />
      </View>

      {/* Occupancy */}
      <View style={styles.occupancyCard}>
        <Text style={styles.sectionTitle}>Occupancy</Text>
        <View style={styles.occupancyGrid}>
          <OccupancyItem label="Flats" occupied={data?.occupied_flats ?? 0} total={data?.total_flats ?? 0} />
          <OccupancyItem label="Rooms" occupied={data?.occupied_rooms ?? 0} total={data?.total_rooms ?? 0} />
          <OccupancyItem label="Bedspaces" occupied={data?.occupied_bedspaces ?? 0} total={data?.total_bedspaces ?? 0} />
        </View>
        <View style={styles.rateContainer}>
          <Text style={styles.rateLabel}>Overall Occupancy</Text>
          <Text style={[styles.rateValue, { color: (data?.occupancy_rate ?? 0) >= 80 ? colors.success : colors.warning }]}>
            {data?.occupancy_rate ?? 0}%
          </Text>
        </View>
      </View>

      {/* Overdue */}
      <View style={styles.overdueCard}>
        <View style={styles.overdueHeader}>
          <Ionicons name="warning" size={20} color={colors.danger} />
          <Text style={styles.sectionTitle}> Overdue Tenants</Text>
        </View>
        {(!data?.overdue_tenants || data.overdue_tenants.length === 0) ? (
          <Text style={styles.emptyText}>No overdue tenants</Text>
        ) : (
          data.overdue_tenants.map((t, i) => (
            <View key={i} style={styles.overdueRow}>
              <Text style={styles.overdueName} numberOfLines={1}>{t.tenant_name}</Text>
              <Text style={styles.overdueAmount}>{formatCurrency(t.total_overdue)}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function OccupancyItem({ label, occupied, total }: { label: string; occupied: number; total: number }) {
  const pct = total > 0 ? (occupied / total) * 100 : 0;
  return (
    <View style={styles.occupancyItem}>
      <Text style={styles.occupancyLabel}>{label}</Text>
      <Text style={styles.occupancyValue}>{occupied}/{total}</Text>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: pct >= 80 ? colors.success : pct >= 50 ? colors.warning : colors.gray[300] }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl * 2 },
  welcomeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarText: { color: colors.white, fontWeight: '700', fontSize: fontSize.lg },
  welcomeText: { color: 'rgba(255,255,255,0.8)', fontSize: fontSize.sm },
  userName: { color: colors.white, fontSize: fontSize.lg, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  statHalf: { flex: 1 },
  occupancyCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  occupancyGrid: { gap: spacing.md },
  occupancyItem: { marginBottom: spacing.sm },
  occupancyLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
  occupancyValue: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, marginVertical: 2 },
  progressBar: { height: 6, backgroundColor: colors.gray[100], borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  rateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rateLabel: { fontSize: fontSize.md, color: colors.textSecondary },
  rateValue: { fontSize: fontSize.xxl, fontWeight: '700' },
  overdueCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },
  overdueHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  emptyText: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.lg },
  overdueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  overdueName: { flex: 1, fontSize: fontSize.sm, color: colors.text },
  overdueAmount: { fontSize: fontSize.sm, fontWeight: '600', color: colors.danger },
});
