const express = require("express");
const { verifyToken, requireRoles } = require("../middleware/auth.middleware");
const { submitSupport, getSupportList } = require("../controllers/supportController");

const router = express.Router();

router.use(verifyToken);

router.post("/submit", submitSupport);
router.get("/list", getSupportList);

module.exports = router;
