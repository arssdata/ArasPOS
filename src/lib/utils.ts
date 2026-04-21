import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { format } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

export function generateOrderCode(prefix: string, sequence: number) {
  const dateStr = format(new Date(), 'ddMMyy');
  const seqStr = sequence.toString().padStart(4, '0');
  return `${prefix}${dateStr}${seqStr}`;
}
