// Calendar-date helpers for the backend.
//
// Every date the app cares about (currentDate, nextReviseDate) represents a
// plain calendar day, not a moment in time. The frontend normalizes every
// date it sends as a "YYYY-MM-DD" string, which `new Date("YYYY-MM-DD")`
// always parses as UTC midnight (a documented JS quirk for date-only ISO
// strings, unlike date-TIME strings which parse as local time). So the
// storage convention across this whole app is: a calendar day is stored as
// that day's UTC midnight instant.
//
// Day-boundary math here therefore has to be done in UTC too, regardless of
// the timezone the Node process itself happens to run in. Using the
// server's local `setHours()` would silently misalign "today" with the
// UTC-midnight values actually in the database whenever the host isn't UTC.

/** Start (00:00:00.000 UTC) and end (23:59:59.999 UTC) of "today", in UTC. */
function getUtcTodayBounds() {
  const now = new Date();
  const startOfDay = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0)
  );
  const endOfDay = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999)
  );
  return { startOfDay, endOfDay };
}

/** Parses a "YYYY-MM-DD" string into a UTC-midnight Date, or null if invalid. */
function parseCalendarDateString(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

module.exports = { getUtcTodayBounds, parseCalendarDateString };
