/**
 * Calendar-date helpers that work in the device's own timezone.
 *
 * Avoid `date.toISOString().slice(0, 10)` for "which day is it": toISOString
 * converts to UTC first, so for anyone ahead of UTC it still returns
 * yesterday for the first hours after local midnight.
 */

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** YYYY-MM-DD for the given moment, in the device timezone (default: now). */
export function toLocalIsoDate(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Local-midnight Date for a YYYY-MM-DD string. `new Date("2026-10-26")` would
 * instead parse as UTC midnight, which is the previous day west of UTC.
 */
export function parseLocalIsoDate(iso: string): Date {
  return new Date(`${iso.slice(0, 10)}T00:00:00`);
}

/** Shift a YYYY-MM-DD date by whole days. */
export function addDaysIso(iso: string, days: number): string {
  const d = parseLocalIsoDate(iso);
  d.setDate(d.getDate() + days);
  return toLocalIsoDate(d);
}
