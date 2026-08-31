// The ONE MongoDB connection ReviseOrbit itself owns: the control plane.
// It only ever holds Tenant metadata (see models/tenantMetaSchema.js) —
// never customer application data. Kept as its own mongoose.createConnection
// instance (not the default `mongoose.connect`) so it's never confused with
// a tenant connection, and both can be closed independently.

const mongoose = require("mongoose");
const tenantMetaSchema = require("../models/tenantMetaSchema");

let centralConnection = null;
let TenantModel = null;

async function connectCentralDb() {
  if (centralConnection) return centralConnection;

  const uri = process.env.CENTRAL_MONGODB_URI;
  if (!uri) {
    throw new Error(
      "CENTRAL_MONGODB_URI is not set. This must point at ReviseOrbit's OWN database " +
        "(metadata only) — not a customer's database."
    );
  }

  centralConnection = await mongoose.createConnection(uri, {
    serverSelectionTimeoutMS: 10000,
  }).asPromise();

  TenantModel = centralConnection.model("Tenant", tenantMetaSchema);

  console.log("Connected to central metadata database.");
  return centralConnection;
}

function getTenantModel() {
  if (!TenantModel) {
    throw new Error("Central database is not connected yet.");
  }
  return TenantModel;
}

async function closeCentralDb() {
  if (centralConnection) {
    await centralConnection.close();
    centralConnection = null;
    TenantModel = null;
  }
}

module.exports = { connectCentralDb, getTenantModel, closeCentralDb };
