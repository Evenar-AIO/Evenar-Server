const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const pinoHttp = require("pino-http");

require("dotenv").config();

const { connectDB } = require("./config/database");
const { initSocket } = require("./socket");

const chatRoutes = require("./routes/chatRoutes");
const feedbackRoutes = require("./routes/feedbackRoutes");
const supportRoutes = require("./routes/supportRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const userRoutes = require("./routes/userRoutes");

const app = express();
const server = http.createServer(app);

app.use(pinoHttp());
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get("/", (req, res) => {
  res.status(200).send("Hello World");
});

app.get("/health", (req, res) => {
  res.status(200).json({ ok: true });
});

app.use("/api/chat", chatRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/users", userRoutes);

const port = Number(process.env.PORT) || 3000;

if (require.main === module) {
  connectDB().then(() => {
    initSocket(server);
    server.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  });
}

module.exports = { app, server };
