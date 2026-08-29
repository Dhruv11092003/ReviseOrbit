const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const user = require("./model/userSchema");
const revise = require("./model/reviseSchema");
const bcrypt = require("bcrypt");
const cron = require("node-cron");

dotenv.config();
const app = express();

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error(
    "JWT_SECRET is not set. Add JWT_SECRET=<a long random string> to your .env before starting this server.",
  );
  process.exit(1);
}
const TOKEN_TTL = "7d";
const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function authMiddleware(req, res, next) {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { username: payload.username };
    next();
  } catch {
    return res
      .status(401)
      .json({ message: "Session expired, please sign in again" });
  }
}

cron.schedule("0 0 * * *", async () => {
  try {
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const result = await revise.updateMany(
      { nextReviseDate: { $gte: startOfDay, $lte: endOfDay } },
      { $set: { isPending: true } },
    );

    console.log(
      `Daily revision update completed. ${result.modifiedCount} tasks activated.`,
    );
  } catch (error) {
    console.error("Daily revision update failed:", error);
  }
});

const connectDB = async () => {
  try {
    await mongoose.connect(`${process.env.MONGODB_URI}`);
    console.log("Connected to MongoDB");
  } catch (e) {
    console.log("Error Connecting to Database", e);
    process.exit(1);
  }
};

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.post("/signup", async (req, res) => {
  const { name, username, password } = req.body;
  const checkUser = await user.findOne({ username });
  if (checkUser) {
    return res.status(409).send("User Already Exists");
  }
  const passwordpattern =
    /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!#$%^&*()+=])[A-Za-z\d!#$%^&*()+=]{8,32}$/;
  if (!passwordpattern.test(password)) {
    return res.send(
      "Password must be between 8 to 32 characters and include alphabets, numbers, and special characters",
    );
  }
  const ecrPassword = await bcrypt.hash(password, 10);
  const payload = { name: name, username: username, password: ecrPassword };
  const newUser = new user(payload);
  await newUser.save();

  res.status(201).send("User Created");
});

app.post("/signin", async (req, res) => {
  const { username, password } = req.body;
  const checkUser = await user.findOne({ username });
  if (checkUser) {
    const checkPass = await bcrypt.compare(password, checkUser.password);
    if (checkPass) {
      const token = jwt.sign({ username }, JWT_SECRET, {
        expiresIn: TOKEN_TTL,
      });
      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: COOKIE_MAX_AGE_MS,
      });
      return res.status(200).send({ username });
    } else {
      return res.status(401).send("Wrong Password");
    }
  } else {
    return res.status(400).send("User Not Found");
  }
});

app.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.status(200).json({ message: "Logged out" });
});

app.post("/newEntry", authMiddleware, async (req, res) => {
  const {
    topic,
    qname,
    qlink,
    bForce,
    optApp,
    timeComp,
    pattern,
    currDate,
    nextDate,
  } = req.body;

  const payload = {
    topic: topic,
    questionName: qname,
    link: qlink,
    bruteForce: bForce,
    optimalApproach: optApp,
    timeComplexity: timeComp,
    patternIdentified: pattern,
    currentDate: currDate,
    nextReviseDate: nextDate,
  };
  const newEntry = new revise(payload);
  await newEntry.save();
  return res.status(201).send("New Entry Added");
});

app.get("/fetchToday", authMiddleware, async (req, res) => {
  const today = new Date();
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);

  const todayWork = await revise.find({
    nextReviseDate: { $gte: startOfDay, $lte: endOfDay },
  });

  if (todayWork.length === 0) {
    return res.status(200).send({ result: "Nothing For Today" });
  } else {
    return res.status(200).send({ result: todayWork });
  }
});

app.get("/fetchAll", authMiddleware, async (req, res) => {
  try {
    const alltasks = await revise.find();
    if (alltasks.length == 0) {
      return res.status(200).send({ result: "Nothing to Show" });
    } else {
      return res.status(200).send({ result: alltasks });
    }
  } catch (e) {
    return res.status(500).send(e.message);
  }
});

app.get("/fetchPending", authMiddleware, async (req, res) => {
  try {
    const pending = await revise.find({ isPending: true });
    if (pending.length === 0) {
      return res.status(200).send({ result: "Nothing is Pending" });
    } else {
      return res.status(200).send({ result: pending });
    }
  } catch (e) {
    return res.status(500).send(e.message);
  }
});

app.post("/updateCompletion/:id", authMiddleware, async (req, res) => {
  try {
    const id = req.params.id;
    const { nextDate } = req.body;

    if (!nextDate) {
      return res.status(400).json({ message: "nextDate is required" });
    }
    const nextReviseDate = new Date(nextDate);
    if (isNaN(nextReviseDate.getTime())) {
      return res.status(400).json({ message: "Invalid nextDate" });
    }

    const today = new Date();
    const updatedWork = await revise.findByIdAndUpdate(
      id,
      {
        $set: { isPending: false, currentDate: today, nextReviseDate: nextReviseDate },
        $inc: { revisionCount: 1 },
      },
      { new: true },
    );

    if (!updatedWork) {
      return res.status(404).json({ message: "Revision task not found" });
    }

    res
      .status(200)
      .json({ message: "Task completed successfully", result: updatedWork });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/updateTodayAll", authMiddleware, async (req, res) => {
  const { nextDate } = req.body;
  try {
    if (!nextDate) {
      return res.status(400).json({ message: "nextDate is required" });
    }

    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const nextReviseDate = new Date(nextDate);
    if (isNaN(nextReviseDate.getTime())) {
      return res.status(400).json({ message: "Invalid nextDate" });
    }

    const updatedWork = await revise.updateMany(
      { nextReviseDate: { $gte: startOfDay, $lte: endOfDay } },
      {
        $set: {
          isPending: false,
          nextReviseDate: nextReviseDate,
          currentDate: today,
        },
        $inc: { revisionCount: 1 },
      },
    );

    res.json({
      message: "Today's work updated successfully",
      updatedCount: updatedWork.modifiedCount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/activateTodayTasks", authMiddleware, async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const result = await revise.updateMany(
      { nextReviseDate: { $gte: startOfDay, $lte: endOfDay } },
      { $set: { isPending: true } },
    );

    res.json({
      message: "Today's tasks activated",
      updatedCount: result.modifiedCount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ---- New: edit / delete (absent from the original backend) --------------

app.put("/updateEntry/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      topic,
      qname,
      qlink,
      bForce,
      optApp,
      timeComp,
      pattern,
      currDate,
      nextDate,
    } = req.body;

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

    const updated = await revise.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true },
    );
    if (!updated) {
      return res.status(404).json({ message: "Revision task not found" });
    }
    res.status(200).json({ message: "Entry updated", result: updated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete("/deleteEntry/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await revise.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "Revision task not found" });
    }
    res.status(200).json({ message: "Entry deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

connectDB();
const PORT = process.env.PORT || 5000;

try {
  app.listen(PORT, () => {
    console.log(`Server Started at ${PORT}`);
  });
} catch (e) {
  console.log("Something went Wrong", e);
}
