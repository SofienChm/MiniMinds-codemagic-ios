/**
 * Utility functions for date/time handling with UTC timezone support
 */

/**
 * Ensures a date string is properly formatted as UTC
 * Backend sends UTC times without 'Z' suffix, causing timezone issues
 */
export function ensureUtcFormat(dateString: string | null | undefined): string {
  if (!dateString) return '';
  
  // If already has timezone info, return as-is
  if (dateString.endsWith('Z') || dateString.includes('+') || dateString.includes('T') && dateString.length > 19) {
    return dateString;
  }
  
  // If it's a datetime string without timezone, append 'Z' to treat as UTC
  if (dateString.includes('T')) {
    return dateString + 'Z';
  }
  
  return dateString;
}

/**
 * Parse a date string as UTC and return Date object
 */
export function parseUtcDate(dateString: string | null | undefined): Date | null {
  if (!dateString) return null;
  return new Date(ensureUtcFormat(dateString));
}

/**
 * Format time from UTC date string
 */
export function formatTime(dateString: string | null | undefined, locale: string = 'en-US'): string {
  const date = parseUtcDate(dateString);
  if (!date) return '';
  
  return date.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Calculate duration between two dates in hours
 */
export function calculateDuration(startDate: string, endDate?: string): number {
  const start = parseUtcDate(startDate);
  if (!start) return 0;
  
  const end = endDate ? parseUtcDate(endDate) : new Date();
  if (!end) return 0;
  
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
}

/**
 * Get time ago string from date
 */
export function getTimeAgo(dateString: string | null | undefined): string {
  const date = parseUtcDate(dateString);
  if (!date) return '';
  
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (seconds < 0) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}min ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}
