// Schemas that live inside a CUSTOMER's own MongoDB (never in the central
// control-plane database). These are plain mongoose.Schema objects, not
// models — a model only gets created against a specific tenant connection
// (see db/tenantManager.js), so the same schema definition works no matter
// which customer database it's attached to.

const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // bcrypt hash, never plaintext
});

// `type` distinguishes a LeetCode-style question revision from a theory
// revision. Existing records predate this field entirely — Mongoose's
// `default` fills it in as "leetcode" on read, so old documents keep working
// without any migration (see routes/revisions.js for how each type's
// required fields are validated on write).
const REVISION_TYPES = ["leetcode", "theory"];

const reviseSchema = new mongoose.Schema(
  {
    type: { type: String, enum: REVISION_TYPES, default: "leetcode" },

    topic: { type: String, required: true },

    // --- LeetCode fields --------------------------------------------------
    questionName: { type: String, default: "" },
    link: { type: String, default: "-" },
    bruteForce: { type: String, default: "-" },
    optimalApproach: { type: String, default: "-" },
    timeComplexity: { type: String, default: "-" },

    // Legacy free-text pattern field. Kept forever for old records; new
    // writes go through primaryPattern/secondaryPatterns instead (canonical
    // pattern slugs from frontend/src/data/patterns.js). Never deleted, so
    // an old record whose pattern couldn't be mapped never loses its text.
    patternIdentified: { type: String, default: "-" },
    primaryPattern: { type: String, default: "" },
    secondaryPatterns: { type: [String], default: [] },

    // --- Theory fields ------------------------------------------------
    title: { type: String, default: "" },
    whatToRevise: { type: String, default: "" },
    shortNotes: { type: String, default: "" },
    keyConcepts: { type: String, default: "" },
    commonMistakes: { type: String, default: "" },
    exampleOrUseCase: { type: String, default: "" },

    // --- Shared -------------------------------------------------------
    additionalNotes: { type: String, default: "" },

    currentDate: { type: Date, default: Date.now, required: true },
    nextReviseDate: {
      type: Date,
      required: true,
      default: () => {
        const d = new Date();
        d.setDate(d.getDate() + 15);
        return d;
      },
    },
    isPending: { type: Boolean, default: false },
    revisionCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

reviseSchema.index({ nextReviseDate: 1 });
reviseSchema.index({ isPending: 1 });
reviseSchema.index({ type: 1 });

module.exports = { userSchema, reviseSchema, REVISION_TYPES };
