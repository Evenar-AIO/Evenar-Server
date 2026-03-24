const mongoose = require("mongoose");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const FileAttachment = require("../models/FileAttachment");
const User = require("../models/User");
const { getIO } = require("../../socket");

/**
 * POST /chat/support - Customer liên hệ support, tự động tạo/tìm conversation với admin
 */
async function findOrCreateSupportConversation(req, res) {
  try {
    const userId = req.user.sub || req.user.id || req.user._id;

    // Tìm conversation support đang mở của customer này
    let conv = await Conversation.findOne({
      participants: userId,
      type: "support",
    });
    if (conv) {
      const populated = await Conversation.findById(conv._id).populate("participants", "username email avatar").lean();
      return res.status(200).json(populated);
    }

    // Tìm một admin bất kỳ để assign
    const admin = await User.findOne({ role: "admin" });
    if (!admin) {
      return res.status(503).json({ error: "Hiện chưa có admin nào. Vui lòng thử lại sau!" });
    }

    conv = await Conversation.create({
      participants: [userId, admin._id],
      type: "support",
    });

    // Thông báo real-time cho admin biết có conversation mới
    const io = getIO();
    if (io) {
      io.to(`user:${admin._id.toString()}`).emit("chat:newConversation", conv);
    }

    const populated = await Conversation.findById(conv._id).populate("participants", "username email avatar").lean();
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /chat/conversations - Tạo hội thoại mới (Customer / EventOwner) - body: { otherUserId }
 * otherUserId có thể là MongoDB ObjectId hoặc tên người dùng
 */
async function createConversation(req, res) {
  try {
    const userId = req.user.sub || req.user.id || req.user._id;
    const { otherUserId } = req.body || {};
    if (!otherUserId) {
      return res.status(400).json({ error: "otherUserId is required" });
    }

    // Nếu otherUserId không phải ObjectId hợp lệ → tìm theo tên hoặc email
    let resolvedOtherUserId = String(otherUserId);
    if (!mongoose.Types.ObjectId.isValid(resolvedOtherUserId)) {
      const otherUser = await User.findOne({
        $or: [{ name: otherUserId }, { email: otherUserId }]
      });
      if (!otherUser) {
        return res.status(404).json({
          error: `Không tìm thấy người dùng có tên hoặc email "${otherUserId}"!`,
        });
      }
      resolvedOtherUserId = otherUser._id;
    }

    let conv = await Conversation.findOne({
      participants: { $all: [userId, resolvedOtherUserId] },
      type: "direct",
    });
    if (conv) {
      // Un-hide if previously hidden by current user
      await Conversation.updateOne(
        { _id: conv._id },
        { $pull: { hiddenBy: userId } }
      );
      const populated = await Conversation.findById(conv._id).populate("participants", "username email avatar").lean();
      return res.status(200).json(populated);
    }
    conv = await Conversation.create({
      participants: [userId, resolvedOtherUserId],
      type: "direct",
    });
    const populated = await Conversation.findById(conv._id).populate("participants", "username email avatar").lean();
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * GET /chat/conversations - Danh sách hội thoại (Customer / EventOwner)
 */
async function getConversations(req, res) {
  try {
    const userId = req.user.sub || req.user.id || req.user._id;
    const conversations = await Conversation.find({ 
        participants: userId,
        hiddenBy: { $ne: userId }
      })
      .sort({ lastMessageAt: -1 })
      .populate("participants", "username email avatar")
      .lean();
    res.json(conversations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * GET /chat/conversations/:id/messages - Lịch sử tin nhắn (Customer / EventOwner)
 */
async function getMessages(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.sub || req.user.id || req.user._id;
    const conv = await Conversation.findOne({ _id: id, participants: userId });
    if (!conv) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const before = req.query.before; // cursor pagination

    let query = { conversationId: id };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("senderId", "username email avatar")
      .lean();

    const messageIds = messages.map((m) => m._id);
    const attachments = await FileAttachment.find({ messageId: { $in: messageIds } }).lean();
    const byMessage = {};
    attachments.forEach((a) => {
      const mid = a.messageId.toString();
      if (!byMessage[mid]) byMessage[mid] = [];
      byMessage[mid].push(a);
    });
    const result = messages.reverse().map((m) => ({
      ...m,
      attachments: byMessage[m._id.toString()] || [],
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /chat/send - Gửi tin nhắn (text hoặc file) (Customer / EventOwner)
 * Body: conversationId, content?, attachments?: [{ filename, url, originalName, mimeType, size }]
 */
async function sendMessage(req, res) {
  try {
    const userId = req.user.sub || req.user.id || req.user._id;
    const { conversationId, content, attachments } = req.body || {};

    if (!conversationId) {
      return res.status(400).json({ error: "conversationId is required" });
    }

    const conv = await Conversation.findOne({ _id: conversationId, participants: userId });
    if (!conv) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const type = attachments?.length ? "file" : "text";
    const message = await Message.create({
      conversationId,
      senderId: userId,
      content: content || "",
      type,
    });

    if (attachments && attachments.length > 0) {
      const docs = attachments.map((a) => ({
        messageId: message._id,
        filename: a.filename,
        originalName: a.originalName,
        mimeType: a.mimeType || "application/octet-stream",
        size: a.size,
        url: a.url,
      }));
      await FileAttachment.insertMany(docs);
    }

    await Conversation.updateOne(
      { _id: conversationId },
      {
        lastMessageAt: new Date(),
        lastMessagePreview: (content || "[File]").slice(0, 100),
        $pull: { hiddenBy: { $in: conv.participants } }
      }
    );

    const populated = await Message.findById(message._id).populate("senderId", "username email avatar").lean();
    const finalAttachments = await FileAttachment.find({ messageId: message._id }).lean();
    const fullMessage = { ...populated, attachments: finalAttachments };

    const io = getIO();
    if (io) {
      conv.participants.forEach((pid) => {
        const id = pid.toString ? pid.toString() : pid;
        if (id !== userId) {
          io.to(`user:${id}`).emit("chat:message", fullMessage);
        }
      });
      io.to(`conv:${conversationId}`).emit("chat:message", fullMessage);
    }

    res.status(201).json(fullMessage);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function deleteConversation(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.sub || req.user.id || req.user._id;

    const conv = await Conversation.findOne({ _id: id, participants: userId });
    if (!conv) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    await Conversation.updateOne(
      { _id: id },
      { $addToSet: { hiddenBy: userId } }
    );

    res.json({ success: true, message: "Conversation hidden" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { findOrCreateSupportConversation, createConversation, getConversations, getMessages, sendMessage, deleteConversation };
