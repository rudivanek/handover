import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const MARKETING_URL = 'https://handover.agency';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
