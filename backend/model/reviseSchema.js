const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");
const reviseSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    default: uuidv4(),
  },
  topic: {
    type: String,
    required: true,
  },
  questionName: {
    type: String,
    required: true,
  },
  link:{
    type:String,
    required:true,
    default:'-'
  },
  bruteForce: {
    type: String,
    required: true,
    default: "-",
  },
  optimalApproach: {
    type: String,
    required: true,
    default: "-",
  },
  timeComplexity: {
    type: String,
    required: true,
    default: "-",
  },
  patternIdentified: {
    type: String,
    required: true,
    default: "-",
  },
  currentDate: {
    type: Date,
    default: Date.now,
    required: true,
  },
  nextReviseDate: {
    type: Date,
    required: true,
    default: () => {
      const now = new Date();
      now.setDate(now.getDate() + 15); // Add 15 days
      return now;
    },
  },
  isPending: {
    type: Boolean,
    default: false,
  },
});

const reviseModel = mongoose.model("Revise", reviseSchema);

module.exports = reviseModel;
