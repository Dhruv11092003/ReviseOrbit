const express = require("express");
const crypto = require("crypto");
const { getTenantModel } = require("../db/central");
const { testConnection, closeTenantConnection } = require("../db/tenantManager");
const { encrypt } = require("../security/encryption");
const { assertSafeMongoUri } = require("../security/ssrfGuard");
const { requireAuth } = require("../middleware/auth");
const { dbTestLimiter } = require("../middleware/rateLimit");

const router = express.Router();

// Turns any raw MongoDB error into a safe, generic message. Real driver
// errors can contain the connection string, credentials, or internal host
// details — none of that should ever reach the browser.
function safeConnectionError() {
  return "Unable to connect to your database. Please verify your MongoDB connection details and network access settings.";
}

/**
 * POST /api/tenant/setup
 * Creates a brand-new workspace and connects its database in one step.
 * This is the "Connect Your Database" primary action on first launch.
 * No auth required yet — there's no user account until this succeeds,
 * since user records live inside the customer's own database.
 */
router.post("/setup", dbTestLimiter, async (req, res) => {
  const { connectionString, label } = req.body || {};

  if (!connectionString || typeof connectionString !== "string") {
    return res.status(400).json({ message: "A MongoDB connection string is required." });
  }

  try {
    await assertSafeMongoUri(connectionString);
  } catch (err) {
    return res.status(400).json({ message: safeConnectionError() });
  }

  try {
    await testConnection(connectionString);
  } catch (err) {
    // Never forward err.message here — it can contain the URI/credentials.
    return res.status(400).json({ message: safeConnectionError() });
  }

  try {
    const Tenant = getTenantModel();
    const tenantId = crypto.randomUUID();
    const encrypted = encrypt(connectionString);

    await Tenant.create({
      tenantId,
      label: typeof label === "string" ? label.slice(0, 120) : "",
      accessStatus: "active",
      dbConfigEncrypted: encrypted,
      dbConnected: true,
      lastConnectionCheckAt: new Date(),
    });

    // tenantId is not a secret — it's a workspace identifier, similar to a
    // slug. It's returned so the browser can remember which workspace to
    // sign in to next time. It grants no access on its own.
    return res.status(201).json({ tenantId });
  } catch (err) {
    console.log(err)
    console.error("Tenant setup failed:", err.message);
    return res.status(500).json({ message: "Could not create your workspace. Please try again." });
  }
});

/**
 * POST /api/tenant/db/test
 * Tests a connection string without saving anything — used by the "Test &
 * Connect" button before commit, and by Settings > Database > Test.
 */
router.post("/db/test", dbTestLimiter, async (req, res) => {
  const { connectionString } = req.body || {};
  if (!connectionString) {
    return res.status(400).json({ message: "A MongoDB connection string is required." });
  }

  try {
    await assertSafeMongoUri(connectionString);
    await testConnection(connectionString);
    return res.json({ ok: true, message: "Connection successful." });
  } catch(err) {
    console.log(err)
    return res.status(400).json({ ok: false, message: safeConnectionError() });
  }
});

/**
 * GET /api/tenant/status
 * Powers the Settings > Database panel. Never returns the connection
 * string itself — only whether one is configured and its last known state.
 */
router.get("/status", requireAuth, async (req, res) => {
  const Tenant = getTenantModel();
  const tenant = await Tenant.findOne({ tenantId: req.tenantId });
  if (!tenant) return res.status(404).json({ message: "Workspace not found." });

  return res.json({
    connected: tenant.accessStatus === "active" && tenant.dbConnected,
    accessStatus: tenant.accessStatus,
    lastConnectionCheckAt: tenant.lastConnectionCheckAt,
  });
});

/**
 * POST /api/tenant/db/reconnect
 * Replaces the stored connection string with a new one (e.g. after
 * rotating database credentials) and re-verifies it.
 */
router.post("/db/reconnect", requireAuth, dbTestLimiter, async (req, res) => {
  const { connectionString } = req.body || {};
  if (!connectionString) {
    return res.status(400).json({ message: "A MongoDB connection string is required." });
  }

  try {
    await assertSafeMongoUri(connectionString);
    await testConnection(connectionString);
  } catch {
    return res.status(400).json({ message: safeConnectionError() });
  }

  const Tenant = getTenantModel();
  await Tenant.updateOne(
    { tenantId: req.tenantId },
    {
      $set: {
        dbConfigEncrypted: encrypt(connectionString),
        dbConnected: true,
        accessStatus: "active",
        lastConnectionCheckAt: new Date(),
      },
    }
  );

  // Drop any cached connection to the OLD database so the next request
  // opens a fresh one against the new credentials.
  await closeTenantConnection(req.tenantId);

  return res.json({ ok: true, message: "Database reconnected." });
});

/**
 * POST /api/tenant/db/disconnect
 * Revokes ReviseOrbit's stored access to the customer's database. Does
 * NOT touch the customer's actual MongoDB or its data in any way.
 */
router.post("/db/disconnect", requireAuth, async (req, res) => {
  const Tenant = getTenantModel();
  await Tenant.updateOne(
    { tenantId: req.tenantId },
    {
      $set: { dbConnected: false, accessStatus: "disconnected" },
      $unset: { dbConfigEncrypted: "" },
    }
  );
  await closeTenantConnection(req.tenantId);

  return res.json({
    ok: true,
    message:
      "Your database has been disconnected. Your MongoDB and its data are untouched — " +
      "ReviseOrbit simply no longer has the connection details. Connect a database again to continue.",
  });
});

module.exports = router;
