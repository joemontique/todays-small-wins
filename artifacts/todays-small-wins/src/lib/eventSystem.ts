import { getDayKey, getMedicationDayKey } from './timeUtils';

export { getDayKey, getMedicationDayKey } from './timeUtils';

export const DEBUG = true;

export type AppMode = 'guest' | 'user';

export type EventType = 'hydration' | 'mood' | 'sleep' | 'nap' | 'medication' | 'poop';

export type Screen = 'log' | 'results' | 'progress' | 'calendar' | 'login';

export interface WellnessEvent {
  id: string;
  type: EventType;
  value: string | number;
  day_key: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

/**
 * Calculates today's win total from the event log.
 * Each category uses its own day-key rule (see timeUtils).
 */
export function calculateWins(events: WellnessEvent[], dayKey: string): number {
  const todayEvents = events.filter(e => e.day_key === dayKey);

  const hydrationCups = todayEvents
    .filter(e => e.type === 'hydration')
    .reduce((sum, e) => sum + Number(e.value), 0);
  const hydrationWins = Math.floor(hydrationCups / 2);

  const moodWins = Math.min(3, todayEvents.filter(e => e.type === 'mood').length);

  // Medication uses midnight-based day key — independent of the 3 AM wellness reset
  const medDayKey = getMedicationDayKey();
  const medicationWins = events.filter(
    e => e.type === 'medication' && e.day_key === medDayKey
  ).length;

  // Only 💩 counts as a win; 💧 (pee) and ❌ (no activity) do not
  const bathroomWins = todayEvents.filter(
    e => e.type === 'poop' && e.value === '💩'
  ).length;

  const sleepWins = events.filter(
    e => e.type === 'sleep' && e.metadata?.stage === 'complete' && e.day_key === dayKey
  ).length;

  const total = hydrationWins + moodWins + medicationWins + bathroomWins + sleepWins;

  if (DEBUG) {
    console.log('[TSW] Wins recalculated:', {
      dayKey,
      medDayKey,
      hydrationCups,
      hydrationWins,
      moodWins,
      medicationWins,
      bathroomWins,
      sleepWins,
      total,
    });
  }

  return total;
}

/**
 * Single entry point for all event creation. Never construct event objects directly.
 * Pass dayKeyOverride only when a category uses a different reset rule (e.g. medication).
 */
export function createEvent(
  type: EventType,
  value: string | number,
  metadata: Record<string, unknown> = {},
  dayKeyOverride?: string
): WellnessEvent {
  const event: WellnessEvent = {
    id: crypto.randomUUID(),
    type,
    value,
    day_key: dayKeyOverride ?? getDayKey(),
    metadata,
    created_at: new Date().toISOString(),
  };

  if (DEBUG) {
    console.log('[TSW] Event created:', event);
  }

  return event;
}
