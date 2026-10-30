import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number | null | undefined, isFrom = false): string {
  if (price === null || price === undefined) return 'A consultar';
  if (price === 0) return 'Gratis';
  const formatted = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(price);
  return isFrom ? `Desde ${formatted}` : formatted;
}

