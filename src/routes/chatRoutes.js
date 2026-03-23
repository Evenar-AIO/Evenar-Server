const express = require("express");
const { verifyToken } = require("../middleware/authMiddleware");
const { findOrCreateSupportConversation, createConversation, getConversations, getMessages, sendMessage, deleteConversation } = require("../controllers/chatController");

const router = express.Router();

router.use(verifyToken);
router.post("/support", findOrCreateSupportConversation); // Customer tự động kết nối với admin
router.post("/conversations", createConversation);
router.get("/conversations", getConversations);
router.get("/conversations/:id/messages", getMessages);
router.delete("/conversations/:id", deleteConversation);
router.post("/send", sendMessage);

module.exports = router;
