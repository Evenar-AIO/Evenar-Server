const express = require("express");
const User = require("../models/User");

const router = express.Router();

/**
 * POST /api/users/dev-login
 * Upsert a user by name for dev/demo purposes.
 * Body: { name, role }
 * Returns: { _id, name, role }
 */
router.post("/dev-login", async (req, res) => {
  try {
    const { name, role } = req.body;
    if (!name) return res.status(400).json({ error: "name is required" });

    const validRole = ["guest", "customer", "eventowner", "admin"].includes(role)
      ? role
      : "customer";

    // Upsert: tìm user theo name, nếu chưa có thì tạo mới
    const user = await User.findOneAndUpdate(
      { name },
      { name, role: validRole },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ _id: user._id, name: user.name, role: user.role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
