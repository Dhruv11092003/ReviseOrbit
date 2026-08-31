// Every handler here reads req.models, which requireAuth (see
// middleware/auth.js) already resolved to the correct tenant's connection.
// No handler ever imports a model directly or accepts a tenant/db
// identifier from the request — that would defeat the whole point.

const express = require("express");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

const EDIT_DELETE_ENABLED = process.env.ENABLE_EDIT_DELETE !== "false";

router.post("/newEntry", async (req, res) => {
  const { topic, qname, qlink, bForce, optApp, timeComp, pattern, currDate, nextDate } =
    req.body || {};

  if (!topic || !qname) {
    return res.status(400).json({ message: "Topic and question name are required." });
  }

  await req.models.Revise.create({
    topic,
    questionName: qname,
    link: qlink,
    bruteForce: bForce,
    optimalApproach: optApp,
    timeComplexity: timeComp,
    patternIdentified: pattern,
    currentDate: currDate,
    nextReviseDate: nextDate,
  });

  return res.status(201).send("New Entry Added");
});

router.get("/fetchToday", async (req, res) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const todayWork = await req.models.Revise.find({
    nextReviseDate: { $gte: startOfDay, $lte: endOfDay },
  });

  return res.status(200).send({ result: todayWork.length === 0 ? "Nothing For Today" : todayWork });
});

router.get("/fetchPending", async (req, res) => {
  const pending = await req.models.Revise.find({ isPending: true });
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

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const result = await req.models.Revise.updateMany(
    { nextReviseDate: { $gte: startOfDay, $lte: endOfDay } },
    {
      $set: { isPending: false, nextReviseDate, currentDate: new Date() },
      $inc: { revisionCount: 1 },
    }
  );

  return res.json({ message: "Today's work updated successfully", updatedCount: result.modifiedCount });
});

router.post("/activateTodayTasks", async (req, res) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const result = await req.models.Revise.updateMany(
    { nextReviseDate: { $gte: startOfDay, $lte: endOfDay } },
    { $set: { isPending: true } }
  );

  return res.json({ message: "Today's tasks activated", updatedCount: result.modifiedCount });
});

if (EDIT_DELETE_ENABLED) {
  router.put("/updateEntry/:id", async (req, res) => {
    const { topic, qname, qlink, bForce, optApp, timeComp, pattern, currDate, nextDate } =
      req.body || {};

    const update = {};
    if (topic !== undefined) update.topic = topic;
    if (qname !== undefined) update.questionName = qname;
    if (qlink !== undefined) update.link = qlink;
    if (bForce !== undefined) update.bruteForce = bForce;
    if (optApp !== undefined) update.optimalApproach = optApp;
    if (timeComp !== undefined) update.timeComplexity = timeComp;
    if (pattern !== undefined) update.patternIdentified = pattern;
    if (currDate !== undefined) update.currentDate = currDate;
    if (nextDate !== undefined) update.nextReviseDate = nextDate;

    const updated = await req.models.Revise.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true }
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
