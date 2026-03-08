import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Badge } from '@/components/Badge';
import { colors, spacing, fontSize, borderRadius } from '@/lib/theme';
import { formatCurrency, formatDate } from '@/lib/utils';

type Section = 'menu' | 'assignments' | 'deposits' | 'maintenance';

interface Assignment {
  id: number;
  tenant_name: string;
  bedspace_code: string;
  room_number: string;
  flat_number: string;
  building_name: string;
  start_date: string;
  end_date: string;
  status: string;
  monthly_rent: number;
}

interface Deposit {
  id: number;
  tenant_name: string;
  amount: number;
  deposit_type: string;
  status: string;
  paid_date: string;
}

interface MaintenanceRequest {
  id: number;
  title: string;
  description: string;
  priority: string;
  status: string;
  building_name: string;
  flat_number: string;
  created_at: string;
}

export default function MoreScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [section, setSection] = useState<Section>('menu');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadSection = async (s: Section) => {
    if (s === 'menu') return;
    setLoading(true);
    try {
      const endpoint = s === 'assignments' ? '/assignments' : s === 'deposits' ? '/deposits' : '/maintenance';
      const res = await api.get(endpoint, { params: { per_page: 100 } });
      setData(res.data.items || []);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { loadSection(section); }, [section]);

  const onRefresh = async () => { setRefreshing(true); await loadSection(section); setRefreshing(false); };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => { await logout(); router.replace('/login'); } },
    ]);
  };

  if (section !== 'menu') {
    return (
      <View style={styles.container}>
        <View style={styles.sectionHeader}>
          <TouchableOpacity onPress={() => setSection('menu')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.sectionTitle}>
            {section === 'assignments' ? 'Assignments' : section === 'deposits' ? 'Deposits' : 'Maintenance'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
          ) : data.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="folder-open-outline" size={48} color={colors.gray[300]} />
              <Text style={styles.emptyText}>No items found</Text>
            </View>
          ) : (
            section === 'assignments' ? data.map((a: Assignment) => (
              <View key={a.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{a.tenant_name}</Text>
                    <Text style={styles.cardSub}>
                      {a.building_name} • Flat {a.flat_number} • Room {a.room_number} • Bed {a.bedspace_code}
                    </Text>
                  </View>
                  <Badge text={a.status} variant={a.status === 'active' ? 'success' : 'gray'} />
                </View>
                <View style={styles.cardFooter}>
                  <View style={styles.chip}>
                    <Ionicons name="calendar-outline" size={12} color={colors.gray[500]} />
                    <Text style={styles.chipText}>{formatDate(a.start_date)} – {a.end_date ? formatDate(a.end_date) : 'Present'}</Text>
                  </View>
                  <Text style={styles.rentText}>{formatCurrency(a.monthly_rent)}/mo</Text>
                </View>
              </View>
            )) : section === 'deposits' ? data.map((d: Deposit) => (
              <View key={d.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{d.tenant_name}</Text>
                    <Text style={styles.cardSub}>{d.deposit_type}</Text>
                  </View>
                  <Badge text={d.status} variant={d.status === 'held' ? 'info' : d.status === 'refunded' ? 'success' : 'warning'} />
                </View>
                <View style={styles.cardFooter}>
                  <View style={styles.chip}>
                    <Ionicons name="calendar-outline" size={12} color={colors.gray[500]} />
                    <Text style={styles.chipText}>{formatDate(d.paid_date)}</Text>
                  </View>
                  <Text style={styles.depositAmount}>{formatCurrency(d.amount)}</Text>
                </View>
              </View>
            )) : data.map((m: MaintenanceRequest) => (
              <View key={m.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{m.title}</Text>
                    <Text style={styles.cardSub} numberOfLines={2}>{m.description}</Text>
                  </View>
                  <Badge text={m.status} variant={m.status === 'completed' ? 'success' : m.status === 'in_progress' ? 'warning' : 'info'} />
                </View>
                <View style={styles.cardFooter}>
                  <View style={styles.chip}>
                    <Ionicons name="location-outline" size={12} color={colors.gray[500]} />
                    <Text style={styles.chipText}>{m.building_name} • Flat {m.flat_number}</Text>
                  </View>
                  <Badge text={m.priority} variant={m.priority === 'high' ? 'danger' : m.priority === 'medium' ? 'warning' : 'gray'} />
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.menuContent}>
      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.profileAvatar}>
          <Text style={styles.profileAvatarText}>
            {user?.username?.charAt(0).toUpperCase() || 'U'}
          </Text>
        </View>
        <Text style={styles.profileName}>{user?.first_name} {user?.last_name}</Text>
        <Text style={styles.profileRole}>{user?.roles?.[0] || 'User'}</Text>
      </View>

      {/* Menu Items */}
      <View style={styles.menuSection}>
        <Text style={styles.menuSectionTitle}>Management</Text>
        <MenuItem icon="swap-horizontal-outline" label="Assignments" onPress={() => setSection('assignments')} />
        <MenuItem icon="shield-checkmark-outline" label="Deposits" onPress={() => setSection('deposits')} />
        <MenuItem icon="construct-outline" label="Maintenance" onPress={() => setSection('maintenance')} />
      </View>

      <View style={styles.menuSection}>
        <Text style={styles.menuSectionTitle}>Account</Text>
        <MenuItem icon="log-out-outline" label="Logout" onPress={handleLogout} danger />
      </View>

      <Text style={styles.version}>RentPro Mobile v1.0.0</Text>
    </ScrollView>
  );
}

function MenuItem({ icon, label, onPress, danger }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; danger?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.6}>
      <View style={[styles.menuItemIcon, danger && { backgroundColor: colors.danger + '15' }]}>
        <Ionicons name={icon} size={20} color={danger ? colors.danger : colors.primary} />
      </View>
      <Text style={[styles.menuItemLabel, danger && { color: colors.danger }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.gray[300]} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  menuContent: { paddingBottom: 40 },
  profileCard: {
    alignItems: 'center', paddingVertical: spacing.xl * 2, backgroundColor: colors.white,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  profileAvatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary + '15',
    justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md,
  },
  profileAvatarText: { fontSize: 32, fontWeight: '700', color: colors.primary },
  profileName: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  profileRole: { fontSize: fontSize.md, color: colors.textSecondary, textTransform: 'capitalize' },
  menuSection: { marginTop: spacing.xl, paddingHorizontal: spacing.lg },
  menuSectionTitle: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.md, textTransform: 'uppercase' },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white,
    paddingVertical: spacing.lg, paddingHorizontal: spacing.lg,
    marginBottom: 1, borderRadius: borderRadius.md,
  },
  menuItemIcon: {
    width: 36, height: 36, borderRadius: borderRadius.md, backgroundColor: colors.primary + '10',
    justifyContent: 'center', alignItems: 'center', marginRight: spacing.md,
  },
  menuItemLabel: { flex: 1, fontSize: fontSize.md, color: colors.text, fontWeight: '500' },
  version: { textAlign: 'center', color: colors.gray[400], fontSize: fontSize.sm, marginTop: spacing.xl * 2 },
  // Section views
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.white, paddingHorizontal: spacing.lg, paddingVertical: spacing.lg,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  list: { flex: 1 },
  listContent: { padding: spacing.lg, paddingBottom: 40 },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.md },
  card: {
    backgroundColor: colors.white, borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md },
  cardTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  cardSub: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.gray[50],
    paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: borderRadius.sm,
  },
  chipText: { fontSize: fontSize.xs, color: colors.gray[600] },
  rentText: { fontSize: fontSize.md, fontWeight: '700', color: colors.primary },
  depositAmount: { fontSize: fontSize.md, fontWeight: '700', color: colors.success },
});
