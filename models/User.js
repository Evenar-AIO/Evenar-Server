const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, sparse: true }, // sparse: cho phép nhiều user không có email
    name: { type: String, unique: true, sparse: true },  // unique theo name để upsert đúng
    role: { type: String, enum: ["guest", "customer", "eventowner", "admin"], default: "customer" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
