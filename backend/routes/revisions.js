// Every handler here reads req.models, which requireAuth (see
// middleware/auth.js) already resolved to the correct tenant's connection.
// No handler ever imports a model directly or accepts a tenant/db
// identifier from the request — that would defeat the whole point.

const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { ensureTodayTasksActivated } = require("../services/revisionActivation");
const { getUtcTodayBounds } = require("../utils/date");
const { REVISION_TYPES } = require("../models/tenantSchemas");

const router = express.Router();
router.use(requireAuth);

const EDIT_DELETE_ENABLED = process.env.ENABLE_EDIT_DELETE !== "false";

function normalizeType(type) {
  return REVISION_TYPES.includes(type) ? type : "leetcode";
}

function normalizeSecondaryPatterns(value) {
  if (!Array.isArray(value)) return undefined;
  return value.filter((v) => typeof v === "string" && v.trim()).map((v) => v.trim()).slice(0, 10);
}

router.post("/newEntry", async (req, res) => {
  const {
    type: rawType,
    topic,
    qname,
    qlink,
    bForce,
    optApp,
    timeComp,
    pattern,
    primaryPattern,
    secondaryPatterns,
    additionalNotes,
    title,
    whatToRevise,
    shortNotes,
    keyConcepts,
    commonMistakes,
    exampleOrUseCase,
    currDate,
    nextDate,
  } = req.body || {};

  const type = normalizeType(rawType);

  if (!topic || !topic.trim()) {
    return res.status(400).json({ message: "Topic is required." });
  }
  if (type === "leetcode" && (!qname || !qname.trim())) {
    return res.status(400).json({ message: "Question name is required for a LeetCode revision." });
  }
  if (type === "theory" && (!title || !title.trim())) {
    return res.status(400).json({ message: "Title is required for a Theory revision." });
  }

  await req.models.Revise.create({
    type,
    topic,
    questionName: qname,
    link: qlink,
    bruteForce: bForce,
    optimalApproach: optApp,
    timeComplexity: timeComp,
    patternIdentified: pattern,
    primaryPattern,
    secondaryPatterns: normalizeSecondaryPatterns(secondaryPatterns),
    additionalNotes,
    title,
    whatToRevise,
    shortNotes,
    keyConcepts,
    commonMistakes,
    exampleOrUseCase,
    currentDate: currDate,
    nextReviseDate: nextDate,
  });

  return res.status(201).send("New Entry Added");
});

router.get("/fetchToday", async (req, res) => {
  await ensureTodayTasksActivated(req.models.Revise);

  const { endOfDay } = getUtcTodayBounds();
  // Due today AND overdue — overdue tasks must keep resurfacing here rather
  // than only appearing on the exact calendar day they were first due.
  const todayWork = await req.models.Revise.find({
    nextReviseDate: { $lte: endOfDay },
  }).sort({ nextReviseDate: 1 });

  return res.status(200).send({ result: todayWork.length === 0 ? "Nothing For Today" : todayWork });
});

router.get("/fetchPending", async (req, res) => {
  await ensureTodayTasksActivated(req.models.Revise);

  const pending = await req.models.Revise.find({ isPending: true }).sort({ nextReviseDate: 1 });
  return res.status(200).send({ result: pending.length === 0 ? "Nothing is Pending" : pending });
});

router.get("/fetchAll", async (req, res) => {
  // Bounded, not "load the whole collection into memory unconditionally" —
  // fine at DSA-revision-list scale, but capped so this route can't be used
  // to pull an unbounded dataset if someone's list grows very large.
  const all = await req.models.Revise.find({}).limit(2000).sort({ nextReviseDate: 1 });
  return res.status(200).send({ result: all });
});

router.post("/updateCompletion/:id", async (req, res) => {
  const { nextDate } = req.body || {};
  if (!nextDate) return res.status(400).json({ message: "nextDate is required" });

  const nextReviseDate = new Date(nextDate);
  if (isNaN(nextReviseDate.getTime())) {
    return res.status(400).json({ message: "Invalid nextDate" });
  }

  // Completion is the ONE place revisionCount changes — manual edits below
  // never touch it, so a correction to a date can never look like a
  // revision event.
  const updated = await req.models.Revise.findByIdAndUpdate(
    req.params.id,
    {
      $set: { isPending: false, currentDate: new Date(), nextReviseDate },
      $inc: { revisionCount: 1 },
    },
    { new: true }
  );

  if (!updated) return res.status(404).json({ message: "Revision task not found" });
  return res.status(200).json({ message: "Task completed successfully", result: updated });
});

router.post("/updateTodayAll", async (req, res) => {
  const { nextDate } = req.body || {};
  if (!nextDate) return res.status(400).json({ message: "nextDate is required" });

  const nextReviseDate = new Date(nextDate);
  if (isNaN(nextReviseDate.getTime())) {
    return res.status(400).json({ message: "Invalid nextDate" });
  }

  const { endOfDay } = getUtcTodayBounds();

  // Matches whatever the Today page currently shows as pending (due today +
  // overdue), not just an exact day window.
  const result = await req.models.Revise.updateMany(
    { isPending: true, nextReviseDate: { $lte: endOfDay } },
    {
      $set: { isPending: false, nextReviseDate, currentDate: new Date() },
      $inc: { revisionCount: 1 },
    }
  );

  return res.json({ message: "Today's work updated successfully", updatedCount: result.modifiedCount });
});

router.post("/activateTodayTasks", async (req, res) => {
  // Manual fallback only — request-time activation already runs
  // automatically before /fetchToday and /fetchPending. Shares the same
  // idempotent service so this can never diverge from that behavior.
  const updatedCount = await ensureTodayTasksActivated(req.models.Revise);
  return res.json({ message: "Today's tasks activated", updatedCount });
});

if (EDIT_DELETE_ENABLED) {
  router.put("/updateEntry/:id", async (req, res) => {
    const {
      type,
      topic,
      qname,
      qlink,
      bForce,
      optApp,
      timeComp,
      pattern,
      primaryPattern,
      secondaryPatterns,
      additionalNotes,
      title,
      whatToRevise,
      shortNotes,
      keyConcepts,
      commonMistakes,
      exampleOrUseCase,
      currDate,
      nextDate,
    } = req.body || {};

    // Explicit whitelist — never Model.findByIdAndUpdate(id, req.body).
    // tenantId, _id, createdAt and revisionCount are never assignable here;
    // this is a manual correction, never a revision event.
    const update = {};
    if (type !== undefined && REVISION_TYPES.includes(type)) update.type = type;
    if (topic !== undefined) update.topic = topic;
    if (qname !== undefined) update.questionName = qname;
    if (qlink !== undefined) update.link = qlink;
    if (bForce !== undefined) update.bruteForce = bForce;
    if (optApp !== undefined) update.optimalApproach = optApp;
    if (timeComp !== undefined) update.timeComplexity = timeComp;
    if (pattern !== undefined) update.patternIdentified = pattern;
    if (primaryPattern !== undefined) update.primaryPattern = primaryPattern;
    if (secondaryPatterns !== undefined) {
      const normalized = normalizeSecondaryPatterns(secondaryPatterns);
      if (normalized !== undefined) update.secondaryPatterns = normalized;
    }
    if (additionalNotes !== undefined) update.additionalNotes = additionalNotes;
    if (title !== undefined) update.title = title;
    if (whatToRevise !== undefined) update.whatToRevise = whatToRevise;
    if (shortNotes !== undefined) update.shortNotes = shortNotes;
    if (keyConcepts !== undefined) update.keyConcepts = keyConcepts;
    if (commonMistakes !== undefined) update.commonMistakes = commonMistakes;
    if (exampleOrUseCase !== undefined) update.exampleOrUseCase = exampleOrUseCase;
    if (currDate !== undefined) update.currentDate = currDate;
    if (nextDate !== undefined) update.nextReviseDate = nextDate;

    const updated = await req.models.Revise.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: "Revision task not found" });
    return res.status(200).json({ message: "Entry updated", result: updated });
  });

  router.delete("/deleteEntry/:id", async (req, res) => {
    const deleted = await req.models.Revise.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Revision task not found" });
    return res.status(200).json({ message: "Entry deleted" });
  });
}

module.exports = router;
