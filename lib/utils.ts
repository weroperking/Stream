import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// TMDB Image helper
export function getTMDBImage(path: string | null, size: string = 'w500'): string {
  if (!path) return '/placeholder.jpg';
  return `https://image.tmdb.org/t/p/${size}${path}`;
}
