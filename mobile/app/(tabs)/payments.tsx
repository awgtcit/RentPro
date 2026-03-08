import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, Alert, TextInput, Modal, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '@/lib/api';
import { Badge } from '@/components/Badge';
import { colors, spacing, fontSize, borderRadius } from '@/lib/theme';
import { formatCurrency, formatDate } from '@/lib/utils';

type Tab = 'invoices' | 'payments';

interface Invoice {
  id: number;
  tenant_name: string;
  amount: number;
  paid_amount: number;
  balance: number;
  status: string;
  due_date: string;
  period_start: string;
  period_end: string;
}

interface Payment {
  id: number;
  tenant_name: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference_number: string;
  invoice_id: number;
}

export default function PaymentsScreen() {
  const [tab, setTab] = useState<Tab>('invoices');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payModalVisible, setPayModalVisible] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [payForm, setPayForm] = useState<Record<string, string>>({});

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      if (tab === 'invoices') {
        const res = await api.get('/invoices', { params: { per_page: 100 }, signal });
        setInvoices(res.data.items || []);
      } else {
        const res = await api.get('/payments', { params: { per_page: 100 }, signal });
        setPayments(res.data.items || []);
      }
    } catch { } finally { setLoading(false); }
  }, [tab]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const openPayModal = (inv: Invoice) => {
    setSelectedInvoice(inv);
    setPayForm({ amount: String(inv.balance), payment_method: 'cash' });
    setPayModalVisible(true);
  };

  const handlePay = async () => {
    if (!selectedInvoice) return;
    const amount = parseFloat(payForm.amount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Enter a valid amount');
      return;
    }
    try {
      await api.post('/payments', {
        invoice_id: selectedInvoice.id,
        amount,
        payment_method: payForm.payment_method || 'cash',
        reference_number: payForm.reference_number || '',
      });
      setPayModalVisible(false);
      setSelectedInvoice(null);
      load();
      Alert.alert('Success', 'Payment recorded');
    } catch {
      Alert.alert('Error', 'Failed to record payment');
    }
  };

  const statusVariant = (s: string) => {
    switch (s.toLowerCase()) {
      case 'paid': return 'success';
      case 'partial': return 'warning';
      case 'overdue': return 'danger';
      default: return 'info';
    }
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: 'invoices', label: 'Invoices' },
    { key: 'payments', label: 'Payments' },
  ];

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabBar}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabItem, tab === t.key && styles.tabItemActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
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
        ) : tab === 'invoices' ? (
          invoices.length === 0 ? (
            <EmptyState icon="document-text-outline" text="No invoices found" />
          ) : (
            invoices.map((inv) => (
              <TouchableOpacity
                key={inv.id}
                style={styles.card}
                onPress={() => inv.status !== 'paid' ? openPayModal(inv) : null}
                activeOpacity={inv.status === 'paid' ? 1 : 0.7}
              >
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>Invoice #{inv.id}</Text>
                    <Text style={styles.cardSub}>{inv.tenant_name}</Text>
                  </View>
                  <Badge text={inv.status} variant={statusVariant(inv.status)} />
                </View>
                <View style={styles.cardRow}>
                  <View style={styles.cardStat}>
                    <Text style={styles.cardStatLabel}>Total</Text>
                    <Text style={styles.cardStatValue}>{formatCurrency(inv.amount)}</Text>
                  </View>
                  <View style={styles.cardStat}>
                    <Text style={styles.cardStatLabel}>Paid</Text>
                    <Text style={[styles.cardStatValue, { color: colors.success }]}>{formatCurrency(inv.paid_amount)}</Text>
                  </View>
                  <View style={styles.cardStat}>
                    <Text style={styles.cardStatLabel}>Balance</Text>
                    <Text style={[styles.cardStatValue, inv.balance > 0 && { color: colors.danger }]}>
                      {formatCurrency(inv.balance)}
                    </Text>
                  </View>
                </View>
                <View style={styles.cardFooter}>
                  <View style={styles.dateChip}>
                    <Ionicons name="calendar-outline" size={12} color={colors.gray[500]} />
                    <Text style={styles.dateChipText}>Due: {formatDate(inv.due_date)}</Text>
                  </View>
                  {inv.status !== 'paid' && (
                    <TouchableOpacity style={styles.payButton} onPress={() => openPayModal(inv)}>
                      <Ionicons name="card-outline" size={14} color={colors.white} />
                      <Text style={styles.payButtonText}>Pay</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            ))
          )
        ) : (
          payments.length === 0 ? (
            <EmptyState icon="wallet-outline" text="No payments found" />
          ) : (
            payments.map((p) => (
              <View key={p.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{p.tenant_name}</Text>
                    <Text style={styles.cardSub}>Payment #{p.id} • Invoice #{p.invoice_id}</Text>
                  </View>
                  <Text style={styles.paymentAmount}>{formatCurrency(p.amount)}</Text>
                </View>
                <View style={styles.cardFooter}>
                  <View style={styles.dateChip}>
                    <Ionicons name="calendar-outline" size={12} color={colors.gray[500]} />
                    <Text style={styles.dateChipText}>{formatDate(p.payment_date)}</Text>
                  </View>
                  <View style={styles.dateChip}>
                    <Ionicons name="card-outline" size={12} color={colors.gray[500]} />
                    <Text style={styles.dateChipText}>{p.payment_method}</Text>
                  </View>
                  {p.reference_number ? (
                    <View style={styles.dateChip}>
                      <Ionicons name="document-outline" size={12} color={colors.gray[500]} />
                      <Text style={styles.dateChipText}>{p.reference_number}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            ))
          )
        )}
      </ScrollView>

      {/* Pay Modal */}
      <Modal visible={payModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Payment</Text>
              <TouchableOpacity onPress={() => setPayModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.gray[500]} />
              </TouchableOpacity>
            </View>
            {selectedInvoice && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.invoiceSummary}>
                  <Text style={styles.invoiceSummaryTitle}>Invoice #{selectedInvoice.id}</Text>
                  <Text style={styles.invoiceSummaryTenant}>{selectedInvoice.tenant_name}</Text>
                  <View style={styles.invoiceSummaryRow}>
                    <Text style={styles.summaryLabel}>Balance Due</Text>
                    <Text style={styles.summaryValue}>{formatCurrency(selectedInvoice.balance)}</Text>
                  </View>
                </View>

                <View style={formStyles.field}>
                  <Text style={formStyles.label}>Amount *</Text>
                  <TextInput
                    style={formStyles.input}
                    value={payForm.amount}
                    onChangeText={(v) => setPayForm({ ...payForm, amount: v })}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={colors.gray[400]}
                  />
                </View>

                <View style={formStyles.field}>
                  <Text style={formStyles.label}>Payment Method</Text>
                  <View style={styles.methodPicker}>
                    {['cash', 'card', 'bank_transfer', 'cheque'].map((m) => (
                      <TouchableOpacity
                        key={m}
                        style={[styles.methodChip, payForm.payment_method === m && styles.methodChipActive]}
                        onPress={() => setPayForm({ ...payForm, payment_method: m })}
                      >
                        <Ionicons
                          name={m === 'cash' ? 'cash-outline' : m === 'card' ? 'card-outline' : m === 'bank_transfer' ? 'business-outline' : 'document-outline'}
                          size={14}
                          color={payForm.payment_method === m ? colors.white : colors.gray[600]}
                        />
                        <Text style={[styles.methodChipText, payForm.payment_method === m && styles.methodChipTextActive]}>
                          {m === 'bank_transfer' ? 'Transfer' : m.charAt(0).toUpperCase() + m.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={formStyles.field}>
                  <Text style={formStyles.label}>Reference Number</Text>
                  <TextInput
                    style={formStyles.input}
                    value={payForm.reference_number || ''}
                    onChangeText={(v) => setPayForm({ ...payForm, reference_number: v })}
                    placeholder="Optional"
                    placeholderTextColor={colors.gray[400]}
                  />
                </View>
              </ScrollView>
            )}
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setPayModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.createButton} onPress={handlePay}>
                <Text style={styles.createButtonText}>Record Payment</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function EmptyState({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.emptyContainer}>
      <Ionicons name={icon} size={48} color={colors.gray[300]} />
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  tabBar: {
    flexDirection: 'row', backgroundColor: colors.white, paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  tabItem: { flex: 1, paddingVertical: spacing.md, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabItemActive: { borderBottomColor: colors.primary },
  tabText: { fontSize: fontSize.md, color: colors.textSecondary, fontWeight: '500' },
  tabTextActive: { color: colors.primary, fontWeight: '700' },
  list: { flex: 1 },
  listContent: { padding: spacing.lg, paddingBottom: 100 },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.md },
  card: {
    backgroundColor: colors.white, borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  cardTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  cardSub: { fontSize: fontSize.sm, color: colors.textSecondary },
  cardRow: { flexDirection: 'row', marginBottom: spacing.md },
  cardStat: { flex: 1, alignItems: 'center' },
  cardStatLabel: { fontSize: fontSize.xs, color: colors.textSecondary, marginBottom: 2 },
  cardStatValue: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.gray[50], paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: borderRadius.sm },
  dateChipText: { fontSize: fontSize.xs, color: colors.gray[600] },
  payButton: {
    flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md,
  },
  payButtonText: { color: colors.white, fontWeight: '600', fontSize: fontSize.sm },
  paymentAmount: { fontSize: fontSize.lg, fontWeight: '700', color: colors.success },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.white, borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, maxHeight: '85%' },
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
  invoiceSummary: {
    backgroundColor: colors.gray[50], borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.xl,
  },
  invoiceSummaryTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  invoiceSummaryTenant: { fontSize: fontSize.md, color: colors.textSecondary, marginBottom: spacing.md },
  invoiceSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
  summaryValue: { fontSize: fontSize.xl, fontWeight: '700', color: colors.danger },
  methodPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  methodChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white,
  },
  methodChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  methodChipText: { fontSize: fontSize.sm, color: colors.gray[600] },
  methodChipTextActive: { color: colors.white, fontWeight: '600' },
});

const formStyles = StyleSheet.create({
  field: { marginBottom: spacing.lg },
  label: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md, fontSize: fontSize.md, color: colors.text,
  },
});
