let io = null;

function initSocket(server) {
  const { Server } = require("socket.io");
  io = new Server(server, {
    cors: { origin: process.env.CLIENT_ORIGIN || "*" },
  });

  io.use((socket, next) => {
    const userId = socket.handshake.auth?.userId || socket.handshake.query?.userId;
    if (!userId) return next(new Error("auth required"));
    socket.userId = userId;
    next();
  });

  io.on("connection", (socket) => {
    socket.join(`user:${socket.userId}`);
    socket.on("chat:join", (conversationId) => {
      socket.join(`conv:${conversationId}`);
    });
    socket.on("chat:leave", (conversationId) => {
      socket.leave(`conv:${conversationId}`);
    });
    socket.on("disconnect", () => {});
  });

  return io;
}

function getIO() {
  return io;
}

module.exports = { initSocket, getIO };
