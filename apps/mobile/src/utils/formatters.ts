/**
 * Formatting utilities for Life OS Mobile
 */

import { EnergyLevel } from '@life-os/types';

/**
 * Format minutes into a human-readable string
 */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}min`;
}

/**
 * Format a deadline date
 */
export function formatDeadline(deadline: string | null): string {
  if (!deadline) return 'No deadline';
  
  const date = new Date(deadline);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Today
  if (date.toDateString() === now.toDateString()) {
    return 'Today';
  }
  
  // Tomorrow
  if (date.toDateString() === tomorrow.toDateString()) {
    return 'Tomorrow';
  }
  
  // This week
  const daysUntil = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntil > 0 && daysUntil <= 7) {
    return date.toLocaleDateString(undefined, { weekday: 'short' });
  }
  
  // Future date
  return date.toLocaleDateString(undefined, { 
    month: 'short', 
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Format energy level
 */
export function formatEnergy(energy: EnergyLevel | null): string {
  if (!energy) return 'Unknown';
  return energy.charAt(0).toUpperCase() + energy.slice(1);
}

/**
 * Format a date for display
 */
export function formatDate(date: string | Date): string {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a date with time
 */
export function formatDateTime(date: string | Date): string {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format confidence as percentage
 */
export function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

/**
 * Format task status
 */
export function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    pending: 'Pending',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
    deferred: 'Deferred',
    idea: 'Idea',
    planned: 'Planned',
    active: 'Active',
    blocked: 'Blocked',
    paused: 'Paused',
    archived: 'Archived',
  };
  return statusMap[status] || status;
}

/**
 * Truncate text to a maximum length
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}
