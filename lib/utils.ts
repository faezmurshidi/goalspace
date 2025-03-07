import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Checks if API calls should be skipped and mock responses used instead
 * For development use only to save on API costs during testing
 */
export const shouldUseMockResponse = () => {
  // Check if we're in development environment
  const isDev = process.env.NODE_ENV === 'development';
  
  // Check if the skipApiCall flag is enabled
  const skipApiCall = process.env.NEXT_PUBLIC_SKIP_API_CALL === 'true';
  
  return isDev && skipApiCall;
}
