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

// Bug fixed here: the character class used to be `[A-Za-z\@d!#$%^&*()+=]`
// — a literal "@" and a literal letter "d", NOT the `\d` digit shorthand.
// Since the class allowed no digit at all while the lookahead below
// required one, NO password could ever satisfy both at once — signup was
// unconditionally broken for every user. Also widened the allowed special
// characters (was missing several common ones despite claiming to allow
// "all special characters").
const SPECIAL_CHARS = "!@#$%^&*()_+\\-=\\[\\]{};:'\",.<>/?~`|\\\\";
const PASSWORD_PATTERN = new RegExp(
  `^(?=.*[A-Za-z])(?=.*\\d)(?=.*[${SPECIAL_CHARS}])[A-Za-z\\d${SPECIAL_CHARS}]{8,32}$`
);

// Cross-origin deployments (frontend and backend on different domains, the
// norm per docs/DEPLOYMENT.md) need SameSite=None for the browser to send
// the cookie back on API requests at all — SameSite=Lax cookies are
// withheld from cross-site fetch/XHR, which silently turns every
// authenticated request into a 401 right after a successful login.
//
// This used to key off `process.env.NODE_ENV === "production"`. That's
// fragile: it depends on the hosting platform actually setting NODE_ENV,
// which several popular Node hosts (Render, Railway, etc.) do NOT do
// automatically — forget that one env var and every login breaks exactly
// the same way, with no indication why. `req.secure` instead reflects
// whether THIS connection is actually HTTPS, including through a reverse
// proxy (main.js already sets `app.set("trust proxy", 1)`, so Express
// reads it off X-Forwarded-Proto when TLS is terminated upstream, which is
// how virtually every PaaS host serves Node apps). That's the one signal
// that's both necessary and sufficient here: SameSite=None is only valid
// over HTTPS in the first place, so "are we on HTTPS right now" is exactly
// the right question, and it needs no deployment configuration to answer
// correctly.
function cookieOptsFor(req) {
  const isHttps = req.secure;
  return {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

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
  res.cookie("token", token, cookieOptsFor(req));
  return res.json({ username });
});

router.post("/logout", (req, res) => {
  res.clearCookie("token", { ...cookieOptsFor(req), maxAge: undefined });
  return res.json({ message: "Logged out." });
});

router.get("/me", requireAuth, (req, res) => {
  return res.json({ username: req.username, tenantId: req.tenantId });
});

module.exports = router;
