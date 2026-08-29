import { getTodayDateString, toDateStringFromBackend } from "./date";

// How many days to wait before the next revision, based on how many times
// a question has already been revised. Grows each time so easy stuff
// stops eating your daily slots, then settles at 30 days.
const INTERVAL_LADDER = [3, 7, 14, 30];

// Max new revisions we want landing on the same day, so a single busy
// session doesn't dump 15 questions on one future date.
export const DAILY_REVISION_CAP = 4;

export function nextIntervalDays(revisionCount = 0) {
  if (revisionCount < INTERVAL_LADDER.length) {
    return INTERVAL_LADDER[revisionCount];
  }
  return INTERVAL_LADDER[INTERVAL_LADDER.length - 1];
}

function addDays(dateStr, days) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function countPerDate(tasks) {
  const counts = {};
  for (const t of tasks) {
    const day = toDateStringFromBackend(t.nextReviseDate);
    if (!day) continue;
    counts[day] = (counts[day] || 0) + 1;
  }
  return counts;
}

// Picks a next revision date: start from the ladder interval, then push
// forward a day at a time while that day is already full.
export function suggestNextDate(revisionCount, existingTasks = [], cap = DAILY_REVISION_CAP) {
  const counts = countPerDate(existingTasks);
  let date = addDays(getTodayDateString(), nextIntervalDays(revisionCount));

  let safety = 0;
  while ((counts[date] || 0) >= cap && safety < 90) {
    date = addDays(date, 1);
    safety++;
  }
  return date;
}
