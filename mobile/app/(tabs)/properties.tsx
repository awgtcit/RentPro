import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, Alert, TextInput, Modal, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '@/lib/api';
import { Badge } from '@/components/Badge';
import { formatCurrency } from '@/lib/utils';
import { colors, spacing, fontSize, borderRadius } from '@/lib/theme';

type Tab = 'buildings' | 'flats' | 'rooms' | 'bedspaces';

export default function PropertiesScreen() {
  const [tab, setTab] = useState<Tab>('buildings');
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [parentOptions, setParentOptions] = useState<{ id: number; label: string }[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/${tab}`, { params: { per_page: 100 } });
      setData(res.data.items || []);
    } catch { } finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const openCreate = async () => {
    setForm({});
    if (tab === 'flats') {
      const res = await api.get('/buildings', { params: { per_page: 500 } });
      setParentOptions((res.data.items || []).map((b: Record<string, unknown>) => ({ id: b.id as number, label: b.name as string })));
    } else if (tab === 'rooms') {
      const res = await api.get('/flats', { params: { per_page: 500 } });
      setParentOptions((res.data.items || []).map((f: Record<string, unknown>) => ({ id: f.id as number, label: f.flat_number as string })));
    } else if (tab === 'bedspaces') {
      const res = await api.get('/rooms', { params: { per_page: 500 } });
      setParentOptions((res.data.items || []).map((r: Record<string, unknown>) => ({ id: r.id as number, label: r.room_number as string })));
    }
    setModalVisible(true);
  };

  const handleCreate = async () => {
    try {
      let payload: Record<string, unknown> = {};
      if (tab === 'buildings') {
        payload = { name: form.name, address: form.address, city: form.city, country: form.country, total_flats: parseInt(form.total_flats || '0') };
      } else if (tab === 'flats') {
        payload = { building_id: parseInt(form.parent_id), flat_number: form.flat_number, floor: parseInt(form.floor || '0'), flat_type: form.flat_type, total_rooms: parseInt(form.total_rooms || '0'), rent_amount: Math.round(parseFloat(form.rent_amount || '0') * 100) };
      } else if (tab === 'rooms') {
        payload = { flat_id: parseInt(form.parent_id), room_number: form.room_number, room_type: form.room_type, capacity: parseInt(form.capacity || '1'), rent_amount: Math.round(parseFloat(form.rent_amount || '0') * 100) };
      } else if (tab === 'bedspaces') {
        payload = { room_id: parseInt(form.parent_id), bedspace_code: form.bedspace_code, rent_amount: Math.round(parseFloat(form.rent_amount || '0') * 100) };
      }
      await api.post(`/${tab}`, payload);
      setModalVisible(false);
      load();
      Alert.alert('Success', `${tab.slice(0, -1)} created`);
    } catch {
      Alert.alert('Error', 'Failed to create');
    }
  };

  const tabs: { key: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'buildings', label: 'Buildings', icon: 'business-outline' },
    { key: 'flats', label: 'Flats', icon: 'home-outline' },
    { key: 'rooms', label: 'Rooms', icon: 'bed-outline' },
    { key: 'bedspaces', label: 'Beds', icon: 'resize-outline' },
  ];

  return (
    <View style={styles.container}>
      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {tabs.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabItem, tab === t.key && styles.tabItemActive]}
            onPress={() => setTab(t.key)}
          >
            <Ionicons name={t.icon} size={18} color={tab === t.key ? colors.primary : colors.gray[400]} />
            <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
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
            <Text style={styles.emptyText}>No {tab} found</Text>
          </View>
        ) : (
          data.map((item) => (
            <PropertyCard key={item.id as number} tab={tab} item={item} />
          ))
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openCreate} activeOpacity={0.8}>
        <Ionicons name="add" size={28} color={colors.white} />
      </TouchableOpacity>

      {/* Create Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add {tab.slice(0, -1)}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.gray[500]} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {tab === 'buildings' && (
                <>
                  <FormField label="Name *" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />
                  <FormField label="Address" value={form.address} onChangeText={(v) => setForm({ ...form, address: v })} />
                  <FormField label="City" value={form.city} onChangeText={(v) => setForm({ ...form, city: v })} />
                  <FormField label="Country" value={form.country} onChangeText={(v) => setForm({ ...form, country: v })} />
                  <FormField label="Total Flats" value={form.total_flats} onChangeText={(v) => setForm({ ...form, total_flats: v })} keyboardType="numeric" />
                </>
              )}
              {tab === 'flats' && (
                <>
                  <PickerField label="Building *" options={parentOptions} value={form.parent_id} onChange={(v) => setForm({ ...form, parent_id: v })} />
                  <FormField label="Flat Number *" value={form.flat_number} onChangeText={(v) => setForm({ ...form, flat_number: v })} />
                  <FormField label="Floor" value={form.floor} onChangeText={(v) => setForm({ ...form, floor: v })} keyboardType="numeric" />
                  <FormField label="Type" value={form.flat_type} onChangeText={(v) => setForm({ ...form, flat_type: v })} placeholder="e.g. 2BHK" />
                  <FormField label="Total Rooms" value={form.total_rooms} onChangeText={(v) => setForm({ ...form, total_rooms: v })} keyboardType="numeric" />
                  <FormField label="Rent" value={form.rent_amount} onChangeText={(v) => setForm({ ...form, rent_amount: v })} keyboardType="decimal-pad" />
                </>
              )}
              {tab === 'rooms' && (
                <>
                  <PickerField label="Flat *" options={parentOptions} value={form.parent_id} onChange={(v) => setForm({ ...form, parent_id: v })} />
                  <FormField label="Room Number *" value={form.room_number} onChangeText={(v) => setForm({ ...form, room_number: v })} />
                  <FormField label="Type" value={form.room_type} onChangeText={(v) => setForm({ ...form, room_type: v })} placeholder="e.g. Single, Double" />
                  <FormField label="Capacity" value={form.capacity} onChangeText={(v) => setForm({ ...form, capacity: v })} keyboardType="numeric" />
                  <FormField label="Rent" value={form.rent_amount} onChangeText={(v) => setForm({ ...form, rent_amount: v })} keyboardType="decimal-pad" />
                </>
              )}
              {tab === 'bedspaces' && (
                <>
                  <PickerField label="Room *" options={parentOptions} value={form.parent_id} onChange={(v) => setForm({ ...form, parent_id: v })} />
                  <FormField label="Bedspace Code *" value={form.bedspace_code} onChangeText={(v) => setForm({ ...form, bedspace_code: v })} placeholder="e.g. A, B, C" />
                  <FormField label="Rent" value={form.rent_amount} onChangeText={(v) => setForm({ ...form, rent_amount: v })} keyboardType="decimal-pad" />
                </>
              )}
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.createButton} onPress={handleCreate}>
                <Text style={styles.createButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function PropertyCard({ tab, item }: { tab: Tab; item: Record<string, unknown> }) {
  const isActive = item.is_active as boolean;
  return (
    <View style={cardStyles.card}>
      <View style={cardStyles.header}>
        <Text style={cardStyles.title}>
          {tab === 'buildings' ? item.name as string :
           tab === 'flats' ? `Flat ${item.flat_number}` :
           tab === 'rooms' ? `Room ${item.room_number}` :
           `Bed ${item.bedspace_code}`}
        </Text>
        <Badge text={isActive ? 'Active' : 'Inactive'} variant={isActive ? 'success' : 'gray'} />
      </View>
      <View style={cardStyles.details}>
        {tab === 'buildings' && (
          <>
            {item.address && <DetailRow icon="location-outline" text={`${item.address}, ${item.city || ''}`} />}
            <DetailRow icon="home-outline" text={`${item.total_flats || 0} flats`} />
          </>
        )}
        {tab === 'flats' && (
          <>
            <DetailRow icon="business-outline" text={item.building_name as string || '—'} />
            <DetailRow icon="layers-outline" text={`Floor ${item.floor || '—'} • ${item.flat_type || '—'}`} />
            {item.rent_amount && <DetailRow icon="cash-outline" text={formatCurrency(item.rent_amount as string)} />}
          </>
        )}
        {tab === 'rooms' && (
          <>
            <DetailRow icon="home-outline" text={`Flat ${item.flat_number || '—'}`} />
            <DetailRow icon="people-outline" text={`${item.room_type || '—'} • Capacity: ${item.capacity || '—'}`} />
            {item.rent_amount && <DetailRow icon="cash-outline" text={formatCurrency(item.rent_amount as string)} />}
          </>
        )}
        {tab === 'bedspaces' && (
          <>
            <DetailRow icon="home-outline" text={`Flat ${item.flat_number || '—'}`} />
            <DetailRow icon="bed-outline" text={`Room ${item.room_number || '—'}`} />
            {item.rent_amount && <DetailRow icon="cash-outline" text={formatCurrency(item.rent_amount as string)} />}
          </>
        )}
      </View>
    </View>
  );
}

function DetailRow({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={cardStyles.detailRow}>
      <Ionicons name={icon} size={14} color={colors.gray[400]} />
      <Text style={cardStyles.detailText} numberOfLines={1}>{text}</Text>
    </View>
  );
}

function FormField({ label, value, onChangeText, placeholder, keyboardType }: {
  label: string; value?: string; onChangeText: (v: string) => void; placeholder?: string; keyboardType?: 'default' | 'numeric' | 'decimal-pad';
}) {
  return (
    <View style={formStyles.field}>
      <Text style={formStyles.label}>{label}</Text>
      <TextInput
        style={formStyles.input}
        value={value || ''}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.gray[400]}
        keyboardType={keyboardType || 'default'}
      />
    </View>
  );
}

function PickerField({ label, options, value, onChange }: {
  label: string; options: { id: number; label: string }[]; value?: string; onChange: (v: string) => void;
}) {
  return (
    <View style={formStyles.field}>
      <Text style={formStyles.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={formStyles.pickerRow}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.id}
            style={[formStyles.pickerChip, value === String(opt.id) && formStyles.pickerChipActive]}
            onPress={() => onChange(String(opt.id))}
          >
            <Text style={[formStyles.pickerChipText, value === String(opt.id) && formStyles.pickerChipTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: 4,
  },
  tabItemActive: { backgroundColor: colors.primary + '10' },
  tabLabel: { fontSize: fontSize.xs, color: colors.gray[400], fontWeight: '500' },
  tabLabelActive: { color: colors.primary, fontWeight: '600' },
  list: { flex: 1 },
  listContent: { padding: spacing.lg, paddingBottom: 100 },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.md },
  fab: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  modalBody: { paddingHorizontal: spacing.xl, paddingVertical: spacing.lg },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
  },
  cancelButtonText: { color: colors.gray[600], fontWeight: '600', fontSize: fontSize.md },
  createButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  createButtonText: { color: colors.white, fontWeight: '600', fontSize: fontSize.md },
});

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  title: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, flex: 1, marginRight: spacing.sm },
  details: { gap: spacing.xs },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  detailText: { fontSize: fontSize.sm, color: colors.textSecondary, flex: 1 },
});

const formStyles = StyleSheet.create({
  field: { marginBottom: spacing.lg },
  label: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
  },
  pickerRow: { flexDirection: 'row' },
  pickerChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.gray[100],
    marginRight: spacing.sm,
  },
  pickerChipActive: { backgroundColor: colors.primary },
  pickerChipText: { fontSize: fontSize.sm, color: colors.gray[600] },
  pickerChipTextActive: { color: colors.white, fontWeight: '600' },
});
