import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '@/lib/theme';

interface Column {
  key: string;
  label: string;
  render?: (row: Record<string, unknown>) => React.ReactNode;
  flex?: number;
}

interface ListCardProps {
  columns: Column[];
  data: Record<string, unknown>[];
  loading?: boolean;
  onRowPress?: (row: Record<string, unknown>) => void;
  emptyText?: string;
  onEndReached?: () => void;
}

export function ListCard({ columns, data, loading, onRowPress, emptyText = 'No records found', onEndReached }: ListCardProps) {
  if (loading && data.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const renderItem = ({ item }: { item: Record<string, unknown> }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() => onRowPress?.(item)}
      activeOpacity={0.7}
      disabled={!onRowPress}
    >
      {columns.map((col) => (
        <View key={col.key} style={[styles.cell, { flex: col.flex || 1 }]}>
          {col.render ? (
            typeof col.render(item) === 'string' ? (
              <Text style={styles.cellText} numberOfLines={1}>{col.render(item) as string}</Text>
            ) : (
              col.render(item)
            )
          ) : (
            <Text style={styles.cellText} numberOfLines={1}>
              {String(item[col.key] ?? '—')}
            </Text>
          )}
        </View>
      ))}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {columns.map((col) => (
          <View key={col.key} style={[styles.cell, { flex: col.flex || 1 }]}>
            <Text style={styles.headerText}>{col.label}</Text>
          </View>
        ))}
      </View>

      {data.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{emptyText}</Text>
        </View>
      ) : (
        <FlatList
          data={data}
          renderItem={renderItem}
          keyExtractor={(item, index) => String(item.id ?? index)}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={loading ? <ActivityIndicator style={styles.footer} color={colors.primary} /> : null}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  loadingContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.xxxl,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.gray[50],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  cell: {
    justifyContent: 'center',
    paddingRight: spacing.sm,
  },
  cellText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  emptyContainer: {
    padding: spacing.xxxl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  footer: {
    padding: spacing.md,
  },
});
