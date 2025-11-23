import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to combine Tailwind CSS classes with conflict resolution
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}