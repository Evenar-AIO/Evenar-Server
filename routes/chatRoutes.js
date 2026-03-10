const express = require("express");
const { getCurrentUser, requireRoles } = require("../middleware/auth");
const { findOrCreateSupportConversation, createConversation, getConversations, getMessages, sendMessage } = require("../controllers/chatController");

const router = express.Router();

router.use(getCurrentUser);
router.use(requireRoles("customer", "eventowner", "admin"));

router.post("/support", findOrCreateSupportConversation); // Customer tự động kết nối với admin
router.post("/conversations", createConversation);
router.get("/conversations", getConversations);
router.get("/conversations/:id/messages", getMessages);
router.post("/send", sendMessage);

module.exports = router;
