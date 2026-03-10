const express = require("express");
const { getCurrentUser, requireRoles } = require("../middleware/auth");
const { submitSupport, getSupportList } = require("../controllers/supportController");

const router = express.Router();

router.use(getCurrentUser);

router.post("/submit", requireRoles("customer", "eventowner"), submitSupport);
router.get("/list", requireRoles("customer", "eventowner", "admin"), getSupportList);

module.exports = router;
