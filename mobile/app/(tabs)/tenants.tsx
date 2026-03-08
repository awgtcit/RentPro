import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, Alert, TextInput, Modal, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '@/lib/api';
import { Badge } from '@/components/Badge';
import { colors, spacing, fontSize, borderRadius } from '@/lib/theme';

interface Tenant {
  id: number;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  nationality: string;
  id_type: string;
  id_number: string;
  is_active: boolean;
}

export default function TenantsScreen() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { per_page: 100 };
      if (search.trim()) params.search = search.trim();
      const res = await api.get('/tenants', { params });
      setTenants(res.data.items || []);
    } catch { } finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const openCreate = () => {
    setForm({});
    setModalVisible(true);
  };

  const handleCreate = async () => {
    if (!form.first_name || !form.last_name) {
      Alert.alert('Error', 'First name and last name are required');
      return;
    }
    try {
      await api.post('/tenants', {
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone || '',
        email: form.email || '',
        nationality: form.nationality || '',
        id_type: form.id_type || '',
        id_number: form.id_number || '',
      });
      setModalVisible(false);
      load();
      Alert.alert('Success', 'Tenant created');
    } catch {
      Alert.alert('Error', 'Failed to create tenant');
    }
  };

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={20} color={colors.gray[400]} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search tenants..."
          placeholderTextColor={colors.gray[400]}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          onSubmitEditing={load}
        />
        {search ? (
          <TouchableOpacity onPress={() => { setSearch(''); }}>
            <Ionicons name="close-circle" size={20} color={colors.gray[400]} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={tenants}
          keyExtractor={(t) => String(t.id)}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color={colors.gray[300]} />
              <Text style={styles.emptyText}>No tenants found</Text>
            </View>
          }
          renderItem={({ item: t }) => (
            <TouchableOpacity style={styles.card} onPress={() => setSelectedTenant(t)} activeOpacity={0.7}>
              <View style={styles.cardHeader}>
                <View style={styles.cardAvatar}>
                  <Text style={styles.cardAvatarText}>
                    {t.first_name.charAt(0)}{t.last_name.charAt(0)}
                  </Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>{t.first_name} {t.last_name}</Text>
                  {t.phone ? <Text style={styles.cardSub}>{t.phone}</Text> : null}
                </View>
                <Badge text={t.is_active ? 'Active' : 'Inactive'} variant={t.is_active ? 'success' : 'gray'} />
              </View>
              <View style={styles.cardDetails}>
                {t.nationality ? (
                  <View style={styles.detailChip}>
                    <Ionicons name="flag-outline" size={12} color={colors.gray[500]} />
                    <Text style={styles.detailChipText}>{t.nationality}</Text>
                  </View>
                ) : null}
                {t.id_type ? (
                  <View style={styles.detailChip}>
                    <Ionicons name="card-outline" size={12} color={colors.gray[500]} />
                    <Text style={styles.detailChipText}>{t.id_type}: {t.id_number}</Text>
                  </View>
                ) : null}
                {t.email ? (
                  <View style={styles.detailChip}>
                    <Ionicons name="mail-outline" size={12} color={colors.gray[500]} />
                    <Text style={styles.detailChipText}>{t.email}</Text>
                  </View>
                ) : null}
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openCreate} activeOpacity={0.8}>
        <Ionicons name="person-add" size={24} color={colors.white} />
      </TouchableOpacity>

      {/* Create Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Tenant</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.gray[500]} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <FormField label="First Name *" value={form.first_name} onChangeText={(v) => setForm({ ...form, first_name: v })} />
              <FormField label="Last Name *" value={form.last_name} onChangeText={(v) => setForm({ ...form, last_name: v })} />
              <FormField label="Phone" value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} keyboardType="phone-pad" />
              <FormField label="Email" value={form.email} onChangeText={(v) => setForm({ ...form, email: v })} keyboardType="email-address" />
              <FormField label="Nationality" value={form.nationality} onChangeText={(v) => setForm({ ...form, nationality: v })} />
              <FormField label="ID Type" value={form.id_type} onChangeText={(v) => setForm({ ...form, id_type: v })} placeholder="e.g. Passport, Emirates ID" />
              <FormField label="ID Number" value={form.id_number} onChangeText={(v) => setForm({ ...form, id_number: v })} />
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

      {/* Detail Modal */}
      <Modal visible={!!selectedTenant} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tenant Details</Text>
              <TouchableOpacity onPress={() => setSelectedTenant(null)}>
                <Ionicons name="close" size={24} color={colors.gray[500]} />
              </TouchableOpacity>
            </View>
            {selectedTenant && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.detailSection}>
                  <View style={styles.detailAvatarLarge}>
                    <Text style={styles.detailAvatarText}>
                      {selectedTenant.first_name.charAt(0)}{selectedTenant.last_name.charAt(0)}
                    </Text>
                  </View>
                  <Text style={styles.detailName}>{selectedTenant.first_name} {selectedTenant.last_name}</Text>
                  <Badge text={selectedTenant.is_active ? 'Active' : 'Inactive'} variant={selectedTenant.is_active ? 'success' : 'gray'} />
                </View>
                <DetailItem label="Phone" value={selectedTenant.phone} icon="call-outline" />
                <DetailItem label="Email" value={selectedTenant.email} icon="mail-outline" />
                <DetailItem label="Nationality" value={selectedTenant.nationality} icon="flag-outline" />
                <DetailItem label="ID Type" value={selectedTenant.id_type} icon="card-outline" />
                <DetailItem label="ID Number" value={selectedTenant.id_number} icon="document-outline" />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function FormField({ label, value, onChangeText, placeholder, keyboardType }: {
  label: string; value?: string; onChangeText: (v: string) => void; placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad' | 'phone-pad' | 'email-address';
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
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'words'}
      />
    </View>
  );
}

function DetailItem({ label, value, icon }: { label: string; value?: string; icon: keyof typeof Ionicons.glyphMap }) {
  if (!value) return null;
  return (
    <View style={detailStyles.item}>
      <Ionicons name={icon} size={18} color={colors.gray[400]} />
      <View>
        <Text style={detailStyles.label}>{label}</Text>
        <Text style={detailStyles.value}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  searchInput: { flex: 1, fontSize: fontSize.md, color: colors.text },
  list: { flex: 1 },
  listContent: { padding: spacing.lg, paddingBottom: 100 },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.md },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  cardAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  cardAvatarText: { color: colors.primary, fontWeight: '700', fontSize: fontSize.md },
  cardInfo: { flex: 1 },
  cardName: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  cardSub: { fontSize: fontSize.sm, color: colors.textSecondary },
  cardDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  detailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.gray[50],
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  detailChipText: { fontSize: fontSize.xs, color: colors.gray[600] },
  fab: {
    position: 'absolute', right: spacing.xl, bottom: spacing.xl,
    width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: colors.white, borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.xl, paddingVertical: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  modalTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  modalBody: { paddingHorizontal: spacing.xl, paddingVertical: spacing.lg },
  modalFooter: {
    flexDirection: 'row', paddingHorizontal: spacing.xl, paddingVertical: spacing.lg, gap: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  cancelButton: { flex: 1, paddingVertical: spacing.md, borderRadius: borderRadius.md, backgroundColor: colors.gray[100], alignItems: 'center' },
  cancelButtonText: { color: colors.gray[600], fontWeight: '600', fontSize: fontSize.md },
  createButton: { flex: 1, paddingVertical: spacing.md, borderRadius: borderRadius.md, backgroundColor: colors.primary, alignItems: 'center' },
  createButtonText: { color: colors.white, fontWeight: '600', fontSize: fontSize.md },
  detailSection: { alignItems: 'center', marginBottom: spacing.xl },
  detailAvatarLarge: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primary + '15',
    justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md,
  },
  detailAvatarText: { color: colors.primary, fontWeight: '700', fontSize: fontSize.xl },
  detailName: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
});

const formStyles = StyleSheet.create({
  field: { marginBottom: spacing.lg },
  label: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md, fontSize: fontSize.md, color: colors.text,
  },
});

const detailStyles = StyleSheet.create({
  item: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.gray[100],
  },
  label: { fontSize: fontSize.xs, color: colors.textSecondary },
  value: { fontSize: fontSize.md, color: colors.text, fontWeight: '500' },
});
