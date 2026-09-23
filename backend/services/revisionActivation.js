// Replaces the old midnight cron. Instead of a background job sweeping every
// tenant's database once a day, each authenticated request that needs
// today's/pending revision data asks THIS tenant's own connection (already
// resolved by requireAuth from the verified JWT) to bring itself up to date
// first. That keeps the four operations below deliberately separate:
//
//   A. Determine what is due       -> nextReviseDate <= today (this file)
//   B. Activate a due revision     -> isPending: false -> true (this file)
//   C. Complete a revision         -> routes/revisions.js updateCompletion
//   D. Manually edit a revision    -> routes/revisions.js updateEntry
//
// so a scheduling bug in one can't silently corrupt another.

const { getUtcTodayBounds } = require("../utils/date");

/**
 * Marks any revision in THIS tenant's database as pending once its
 * nextReviseDate has arrived (today or earlier — overdue tasks stay due,
 * they don't fall off a cliff at midnight). Safe to call on every request:
 *
 *  - Idempotent: only touches documents where isPending is still false, so
 *    calling it twice in a row is a no-op the second time.
 *  - Never increments revisionCount, and never changes currentDate or
 *    nextReviseDate — activation is not a revision event.
 *  - Never creates or duplicates documents.
 *  - Scoped to the single Revise model passed in (the caller's tenant),
 *    never a global scan across tenants.
 */
async function ensureTodayTasksActivated(ReviseModel) {
  const { endOfDay } = getUtcTodayBounds();

  const result = await ReviseModel.updateMany(
    { isPending: false, nextReviseDate: { $lte: endOfDay } },
    { $set: { isPending: true } }
  );

  return result.modifiedCount || 0;
}

module.exports = { ensureTodayTasksActivated };
