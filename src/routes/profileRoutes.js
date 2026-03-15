const express = require("express");
const router = express.Router();

const profileController = require("../controllers/profileController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

router.get("/me", authMiddleware, profileController.getMe);

router.post(
    "/profile/update",
    authMiddleware,
    roleMiddleware("Customer"),
    profileController.updateProfile
);

router.post(
    "/owner/profile/update",
    authMiddleware,
    roleMiddleware("EventOwner"),
    profileController.updateOwnerProfile
);

module.exports = router;