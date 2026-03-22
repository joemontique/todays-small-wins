/**
 * Central time utility module for Today's Small Wins.
 * All date/time logic lives here — no inline date construction elsewhere.
 */

/**
 * Returns the current day key (YYYY-MM-DD) using a 3:00 AM reset rule.
 * Times between 12:00 AM and 2:59 AM belong to the previous calendar day.
 * Used for all wellness events except medication.
 */
export function getDayKey(): string {
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
 * Returns the current day key (YYYY-MM-DD) using a standard midnight reset.
 * Used exclusively for medication tracking — resets at midnight, not 3 AM.
 */
export function getMedicationDayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns the current wall-clock time as an HH:MM string.
 */
export function nowHHMM(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

/**
 * Returns true if the current wall-clock hour is 19:00 or later.
 * Used to gate sleep bedtime logging.
 */
export function isAfter7PM(): boolean {
  return new Date().getHours() >= 19;
}
