import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const MARKETING_URL = 'https://handover.agency';
export const EXAMPLE_MANUAL_URL = 'https://app.handover.agency/m/aurora-dental-4k2m9x';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
