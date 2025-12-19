import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Safely parse JSON from a fetch Response
 * Handles empty responses and parse errors gracefully
 */
export async function safeJson<T = any>(res: Response, fallback: T | null = null): Promise<T | null> {
  try {
    const text = await res.text();
    if (!text || text.trim() === '') {
      return fallback;
    }
    return JSON.parse(text) as T;
  } catch (error) {
    console.warn('Failed to parse JSON response:', error);
    return fallback;
  }
}
