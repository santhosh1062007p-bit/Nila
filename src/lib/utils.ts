import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format paise into Indian Rupee currency string.
 * Example: 30000 paise -> "₹300"
 */
export function formatINR(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(rupees);
}

/**
 * Format Rupees into currency string.
 */
export function formatRupees(rupees: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(rupees);
}

/**
 * Generate human-readable order tracking code.
 * Example: NT-84920
 */
export function generateOrderCode(): string {
  const random = Math.floor(10000 + Math.random() * 90000);
  return `NT-${random}`;
}

/**
 * Get available delivery / pickup time slots.
 */
export const AVAILABLE_TIME_SLOTS = [
  '10:00 AM – 01:00 PM (Morning Slot)',
  '01:00 PM – 04:00 PM (Afternoon Slot)',
  '04:00 PM – 07:00 PM (Evening Slot)',
  '07:00 PM – 09:30 PM (Night Celebration Slot)',
];

/**
 * Get next 7 available dates for delivery/pickup.
 */
export function getAvailableDates(): { value: string; label: string }[] {
  const dates = [];
  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const value = d.toISOString().split('T')[0];
    let label = d.toLocaleDateString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    if (i === 0) label = `Today (${label})`;
    if (i === 1) label = `Tomorrow (${label})`;
    dates.push({ value, label });
  }

  return dates;
}

