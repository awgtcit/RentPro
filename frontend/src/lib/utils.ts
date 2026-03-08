/**
 * Common utility helpers.
 */

import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/** Format cents to display currency (e.g. 150000 → "1,500.00") */
export function formatCurrency(cents: string | number | null | undefined): string {
  if (cents == null) return '0.00';
  const num = typeof cents === 'string' ? parseFloat(cents) : cents / 100;
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Format ISO date string to readable date */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Format ISO datetime to readable datetime */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Status badge color class helper */
export function statusColor(status: string): string {
  const map: Record<string, string> = {
    active: 'badge-success',
    paid: 'badge-success',
    completed: 'badge-success',
    held: 'badge-info',
    partial: 'badge-warning',
    overdue: 'badge-danger',
    ended: 'badge-gray',
    cancelled: 'badge-gray',
    draft: 'badge-gray',
    open: 'badge-info',
    in_progress: 'badge-warning',
    sent: 'badge-info',
    forfeited: 'badge-danger',
    refunded: 'badge-info',
    transferred: 'badge-warning',
  };
  return map[status] || 'badge-gray';
}
