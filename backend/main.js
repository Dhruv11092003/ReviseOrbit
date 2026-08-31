const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const cron = require("node-cron");

dotenv.config();

const { connectCentralDb, getTenantModel, closeCentralDb } = require("./db/central");
const { closeAllTenantConnections, getTenantModels } = require("./db/tenantManager");
const { apiLimiter } = require("./middleware/rateLimit");
const tenantRoutes = require("./routes/tenant");
const authRoutes = require("./routes/auth");
const revisionRoutes = require("./routes/revisions");

// --- Required config, fail fast and clearly if missing ---------------
const REQUIRED_ENV = ["CENTRAL_MONGODB_URI", "JWT_SECRET", "ENCRYPTION_KEY", "FRONTEND_URL"];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(", ")}`);
  console.error("See .env.example for what each one is for.");
  process.exit(1);
}

const app = express();
app.set("trust proxy", 1); // needed for correct client IPs behind a hosting provider's proxy

app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);
app.use(express.json({ limit: "200kb" })); // small ceiling — this app has no file uploads
app.use(cookieParser());
app.use(apiLimiter);

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/tenant", tenantRoutes);
app.use("/", authRoutes); // /signup, /signin, /logout, /me — unchanged paths for the existing frontend
app.use("/", revisionRoutes); // /newEntry, /fetchToday, /fetchPending, /fetchAll, etc — same paths as before

// Centralized error handler — never leak stack traces or raw driver errors.
app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({ message: "Something went wrong. Please try again." });
});

// --- Daily activation cron, now run per-active-tenant -----------------
// Each tenant's data lives in its own database, so "activate today's
// tasks" has to run once per connected tenant rather than once globally.
async function runDailyActivationForAllTenants() {
  try {
    const Tenant = getTenantModel();
    const tenants = await Tenant.find({ accessStatus: "active" }).select("+dbConfigEncrypted");

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    for (const tenant of tenants) {
      try {
        const models = await getTenantModels(tenant.tenantId, tenant.dbConfigEncrypted);
        const result = await models.Revise.updateMany(
          { nextReviseDate: { $gte: startOfDay, $lte: endOfDay } },
          { $set: { isPending: true } }
        );
        if (result.modifiedCount > 0) {
          console.log(`[cron] ${tenant.tenantId}: activated ${result.modifiedCount} task(s).`);
        }
      } catch (err) {
        // One tenant's DB being unreachable must never stop the others.
        console.error(`[cron] Skipped tenant ${tenant.tenantId}: ${err.message}`);
      }
    }
  } catch (err) {
    console.error("[cron] Daily activation run failed:", err.message);
  }
}

cron.schedule("0 0 * * *", runDailyActivationForAllTenants);

// --- Startup -----------------------------------------------------------
const PORT = process.env.PORT || 5000;
let server;

connectCentralDb()
  .then(() => {
    server = app.listen(PORT, () => {
      console.log(`ReviseOrbit API listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to the central database:", err.message);
    process.exit(1);
  });

// --- Graceful shutdown ---------------------------------------------------
async function shutdown(signal) {
  console.log(`${signal} received, shutting down gracefully...`);
  try {
    if (server) await new Promise((resolve) => server.close(resolve));
    await closeAllTenantConnections();
    await closeCentralDb();
    console.log("Shutdown complete.");
    process.exit(0);
  } catch (err) {
    console.error("Error during shutdown:", err);
    process.exit(1);
  }
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

module.exports = app;
