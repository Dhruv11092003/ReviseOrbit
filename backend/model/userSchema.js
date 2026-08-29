const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");
const user = new mongoose.Schema({
  id: {
    type: String,
    default: uuidv4(),
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: true,
  },
});

const userModel = mongoose.model("User", user);
module.exports = userModel;