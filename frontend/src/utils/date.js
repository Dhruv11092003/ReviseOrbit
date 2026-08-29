// Centralized, timezone-safe date handling.
//
// The backend stores currentDate / nextReviseDate as Mongo Date objects and
// returns them as ISO strings (e.g. "2026-09-11T00:00:00.000Z"). If we parse
// those with `new Date(iso)` and then read getDate()/getMonth() etc. in a
// timezone behind UTC, the displayed day can roll back by one. All reads and
// writes of "calendar day" values go through the helpers below so this only
// has to be handled in one place.

/** Returns today's date as "YYYY-MM-DD" in the user's local calendar. */
export function getTodayDateString() {
  const d = new Date();
  return toDateString(d);
}

/** Converts a JS Date (local time) to "YYYY-MM-DD". */
export function toDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Takes any date-ish value from the backend (ISO string or Date) and returns
 * "YYYY-MM-DD" using the UTC calendar date the backend stored, rather than
 * the browser's local timezone. This matches what the backend intended
 * (it stores plain calendar dates at UTC midnight) and avoids the
 * off-by-one-day bug.
 */
export function toDateStringFromBackend(value) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Formats a backend date value for display, e.g. "Sep 11, 2026". */
export function formatDate(value) {
  const str = toDateStringFromBackend(value);
  if (!str) return "—";
  const [y, m, d] = str.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Formats a backend date value for an <input type="date"> field. */
export function formatDateForInput(value) {
  return toDateStringFromBackend(value);
}

/** True if the given backend date value falls on today's local calendar date. */
export function isToday(value) {
  return toDateStringFromBackend(value) === getTodayDateString();
}

/** True if the given backend date value is strictly before today. */
export function isOverdue(value) {
  const str = toDateStringFromBackend(value);
  if (!str) return false;
  return str < getTodayDateString();
}

/** Minimum selectable date string for "next revision" pickers (today). */
export function minSelectableDate() {
  return getTodayDateString();
}
