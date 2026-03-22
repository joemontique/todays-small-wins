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
 * Returns today's day key (YYYY-MM-DD) with a 3:00 AM reset rule.
 * Times between 12:00 AM and 2:59 AM belong to the previous calendar day.
 * Used for all event types except medication.
 */
export function getTodayKey(): string {
  const now = new Date();
  const target = now.getHours() < 3
    ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
    : now;
  const y = target.getFullYear();
  const m = String(target.getMonth() + 1).padStart(2, '0');
  const d = String(target.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns the current calendar day key (YYYY-MM-DD) using standard midnight reset.
 * Used exclusively for medication tracking — resets at midnight, not 3 AM.
 */
export function getMedicationDayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function calculateWins(events: WellnessEvent[], dayKey: string): number {
  const todayEvents = events.filter(e => e.day_key === dayKey);

  const hydrationCups = todayEvents
    .filter(e => e.type === 'hydration')
    .reduce((sum, e) => sum + Number(e.value), 0);
  const hydrationWins = Math.floor(hydrationCups / 2);

  const moodWins = Math.min(3, todayEvents.filter(e => e.type === 'mood').length);

  const medicationWins = todayEvents.filter(e => e.type === 'medication').length;

  // Only 💩 events count as wins; 💧 (pee) and ❌ (no activity) do not
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

export function createEvent(
  type: EventType,
  value: string | number,
  metadata: Record<string, unknown> = {}
): WellnessEvent {
  const event: WellnessEvent = {
    id: crypto.randomUUID(),
    type,
    value,
    day_key: getTodayKey(),
    metadata,
    created_at: new Date().toISOString(),
  };

  if (DEBUG) {
    console.log('[TSW] Event created:', event);
  }

  return event;
}
