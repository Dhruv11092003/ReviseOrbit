// IMPORTANT — how tenantId is used here vs. everywhere else:
//
// Before login, there is no session yet, so the browser must say which
// workspace it's trying to sign into. `tenantId` is a non-secret workspace
// identifier (like a Slack workspace slug) — knowing it lets you attempt a
// login against that workspace's database, nothing more. It does NOT grant
// data access by itself: the actual username/password is still checked
// against bcrypt hashes stored inside that specific tenant's own database.
//
// After login, tenantId is never taken from the client again — every
// subsequent request re-derives it from the signed JWT (see
// middleware/auth.js). This route is the one deliberate, documented
// exception, and it's necessary because nothing else could identify the
// workspace before a session exists.

const express = require("express");
const bcrypt = require("bcrypt");
const { getTenantModel } = require("../db/central");
const { getTenantModels } = require("../db/tenantManager");
const { signSessionToken, requireAuth } = require("../middleware/auth");
const { authLimiter } = require("../middleware/rateLimit");

const router = express.Router();

const PASSWORD_PATTERN =
  /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@!#$%^&*()+=])[A-Za-z\@d!#$%^&*()+=]{8,32}$/;

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

async function resolveActiveTenantModels(tenantId) {
  const Tenant = getTenantModel();
  const tenant = await Tenant.findOne({ tenantId }).select("+dbConfigEncrypted");
  if (!tenant || tenant.accessStatus !== "active" || !tenant.dbConfigEncrypted) {
    return null;
  }
  return getTenantModels(tenantId, tenant.dbConfigEncrypted);
}

router.post("/signup", authLimiter, async (req, res) => {
  const { tenantId, name, username, password } = req.body || {};
  if (!tenantId || !name || !username || !password) {
    return res.status(400).json({ message: "All fields are required." });
  }
  if (!PASSWORD_PATTERN.test(password)) {
    return res.status(400).json({
      message:
        "Password must be 8-32 characters and include letters, numbers, and a special character.",
    });
  }

  const models = await resolveActiveTenantModels(tenantId);
  if (!models) {
    return res.status(400).json({ message: "This workspace's database is not connected." });
  }

  const existing = await models.User.findOne({ username });
  if (existing) {
    // Deliberately vague — avoids confirming account existence beyond what
    // the signup flow already implies.
    return res.status(409).json({ message: "That username is already taken." });
  }

  const hash = await bcrypt.hash(password, 12);
  await models.User.create({ name, username, password: hash });

  return res.status(201).json({ message: "Account created." });
});

router.post("/signin", authLimiter, async (req, res) => {
  const { tenantId, username, password } = req.body || {};
  if (!tenantId || !username || !password) {
    return res.status(400).json({ message: "Workspace, username, and password are required." });
  }

  const models = await resolveActiveTenantModels(tenantId);
  if (!models) {
    return res.status(400).json({ message: "This workspace's database is not connected." });
  }

  const user = await models.User.findOne({ username });
  // Same generic message whether the user doesn't exist or the password is
  // wrong — avoids leaking which case it was (account enumeration).
  const genericFail = () => res.status(401).json({ message: "Invalid username or password." });

  if (!user) return genericFail();
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return genericFail();

  const token = signSessionToken(tenantId, username);
  res.cookie("token", token, COOKIE_OPTS);
  return res.json({ username });
});

router.post("/logout", (req, res) => {
  res.clearCookie("token", { ...COOKIE_OPTS, maxAge: undefined });
  return res.json({ message: "Logged out." });
});

router.get("/me", requireAuth, (req, res) => {
  return res.json({ username: req.username, tenantId: req.tenantId });
});

module.exports = router;
