// Every authenticated request's tenant comes from ONE place: the verified
// JWT in the HttpOnly cookie. Nothing in the request body, query string, or
// headers is ever trusted to pick which customer's database gets touched —
// that's the whole point of tenant isolation.

const jwt = require("jsonwebtoken");
const { getTenantModel } = require("../db/central");
const { getTenantModels } = require("../db/tenantManager");

const JWT_SECRET = process.env.JWT_SECRET;

function signSessionToken(tenantId, username) {
  return jwt.sign({ tenantId, username }, JWT_SECRET, { expiresIn: "7d" });
}

async function requireAuth(req, res, next) {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ message: "Session expired, please sign in again" });
  }

  const { tenantId, username } = payload;
  if (!tenantId || !username) {
    return res.status(401).json({ message: "Invalid session" });
  }

  try {
    const Tenant = getTenantModel();
    const tenant = await Tenant.findOne({ tenantId }).select("+dbConfigEncrypted");
    if (!tenant || tenant.accessStatus !== "active" || !tenant.dbConfigEncrypted) {
      return res.status(403).json({ message: "This workspace's database is not connected." });
    }

    const models = await getTenantModels(tenantId, tenant.dbConfigEncrypted);

    req.tenantId = tenantId;
    req.username = username;
    req.models = models;
    next();
  } catch (err) {
    console.error("Tenant resolution failed:", err.message);
    return res.status(503).json({
      message: "Unable to reach your database right now. Please try again shortly.",
    });
  }
}

module.exports = { requireAuth, signSessionToken };
