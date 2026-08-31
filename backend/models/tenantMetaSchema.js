// This is the ONLY schema that lives in ReviseOrbit's own central MongoDB.
// It intentionally holds nothing about what's inside a customer's app —
// no users, no revisions, no passwords. Just enough to know which
// encrypted database configuration to use for a given tenant, and whether
// that tenant currently has access.

const mongoose = require("mongoose");

const tenantSchema = new mongoose.Schema(
  {
    // Public, non-secret workspace identifier. Not a credential — think of
    // it like a workspace slug. It only ever tells the server which
    // encrypted config to decrypt; it never grants access by itself.
    tenantId: { type: String, required: true, unique: true, index: true },

    // Optional, for the customer's own reference / license contact only.
    label: { type: String, default: "" },

    accessStatus: {
      type: String,
      enum: ["active", "suspended", "disconnected"],
      default: "active",
    },

    // AES-256-GCM encrypted MongoDB connection string. Never selected by
    // default, never returned from any API response, never logged.
    // See security/encryption.js for how this is written/read.
    dbConfigEncrypted: {
      type: {
        iv: String,
        tag: String,
        data: String,
      },
      select: false,
    },

    dbConnected: { type: Boolean, default: false },
    lastConnectionCheckAt: Date,
  },
  { timestamps: true }
);

// Keep the encrypted blob out of any default projection, belt-and-braces
// on top of `select: false` above.
tenantSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.dbConfigEncrypted;
    return ret;
  },
});

module.exports = tenantSchema;
