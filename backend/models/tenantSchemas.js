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

const reviseSchema = new mongoose.Schema({
  topic: { type: String, required: true },
  questionName: { type: String, required: true },
  link: { type: String, default: "-" },
  bruteForce: { type: String, default: "-" },
  optimalApproach: { type: String, default: "-" },
  timeComplexity: { type: String, default: "-" },
  patternIdentified: { type: String, default: "-" },
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
});

module.exports = { userSchema, reviseSchema };
