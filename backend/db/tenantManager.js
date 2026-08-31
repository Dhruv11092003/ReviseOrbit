// Owns every connection to a CUSTOMER's MongoDB. One cached mongoose
// connection per tenant, reused across requests instead of opening a new
// connection every time (which would fall over fast with more than a
// handful of customers).
//
// Strategy:
//  - Cache up to MAX_TENANT_CONNECTIONS live connections at once.
//  - Evict the least-recently-used connection when that cap is hit.
//  - Close any connection that's been idle for IDLE_TIMEOUT_MS.
//  - Never let two different tenants share a connection, ever.

const mongoose = require("mongoose");
const { decrypt } = require("../security/encryption");
const { userSchema, reviseSchema } = require("../models/tenantSchemas");

const MAX_TENANT_CONNECTIONS = Number(process.env.MAX_TENANT_CONNECTIONS || 50);
const IDLE_TIMEOUT_MS = Number(process.env.TENANT_CONNECTION_IDLE_MS || 30 * 60 * 1000);

// tenantId -> { connection, lastUsedAt, models: { User, Revise } }
const cache = new Map();

function touch(tenantId) {
  const entry = cache.get(tenantId);
  if (entry) entry.lastUsedAt = Date.now();
}

async function evictLeastRecentlyUsed() {
  let oldestId = null;
  let oldestAt = Infinity;
  for (const [id, entry] of cache) {
    if (entry.lastUsedAt < oldestAt) {
      oldestAt = entry.lastUsedAt;
      oldestId = id;
    }
  }
  if (oldestId) await closeTenantConnection(oldestId);
}

async function closeTenantConnection(tenantId) {
  const entry = cache.get(tenantId);
  if (!entry) return;
  cache.delete(tenantId);
  try {
    await entry.connection.close();
  } catch {
    // already gone — fine
  }
}

async function openConnection(uri) {
  const connection = mongoose.createConnection(uri, {
    serverSelectionTimeoutMS: 8000,
    maxPoolSize: 5, // keep each tenant's own footprint small
  });
  await connection.asPromise();
  return connection;
}

/**
 * Returns the cached (User, Revise) models for a tenant, opening a fresh
 * connection if none is cached. `getEncryptedConfig` is a callback so this
 * module never has to know about the central Tenant document shape.
 */
async function getTenantModels(tenantId, encryptedConfig) {
  const existing = cache.get(tenantId);
  if (existing) {
    touch(tenantId);
    return existing.models;
  }

  if (cache.size >= MAX_TENANT_CONNECTIONS) {
    await evictLeastRecentlyUsed();
  }

  const uri = decrypt(encryptedConfig);
  const connection = await openConnection(uri);

  const models = {
    User: connection.model("User", userSchema),
    Revise: connection.model("Revise", reviseSchema),
  };

  cache.set(tenantId, { connection, lastUsedAt: Date.now(), models });
  return models;
}

/** Used by the "Test & Connect" flow — opens, verifies, closes immediately. */
async function testConnection(uri) {
  const connection = await openConnection(uri);
  try {
    await connection.db.admin().ping();
  } finally {
    await connection.close();
  }
}

function sweepIdleConnections() {
  const now = Date.now();
  for (const [tenantId, entry] of cache) {
    if (now - entry.lastUsedAt > IDLE_TIMEOUT_MS) {
      closeTenantConnection(tenantId);
    }
  }
}

const sweepInterval = setInterval(sweepIdleConnections, 5 * 60 * 1000);
sweepInterval.unref(); // don't keep the process alive just for this timer

async function closeAllTenantConnections() {
  clearInterval(sweepInterval);
  const ids = Array.from(cache.keys());
  await Promise.all(ids.map(closeTenantConnection));
}

module.exports = {
  getTenantModels,
  testConnection,
  closeTenantConnection,
  closeAllTenantConnections,
};
