const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const pinoHttp = require("pino-http");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");

require("dotenv").config();
const connectDB = require("./src/config/db");

const { initSocket } = require("./socket");

const chatRoutes = require("./src/routes/chatRoutes");
const feedbackRoutes = require("./src/routes/feedbackRoutes");
const supportRoutes = require("./src/routes/supportRoutes");
const notificationRoutes = require("./src/routes/notificationRoutes");
const userRoutes = require("./src/routes/userRoutes");

const app = express();
const server = http.createServer(app);

/* ---------------- Middleware ---------------- */
app.use(pinoHttp());
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: "Hệ thống đang bận do quá nhiều yêu cầu, vui lòng thử lại sau vài phút.",
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

/* ---------------- Routes ---------------- */
const eventsRouter = require('./src/routes/events');
const genresRouter = require('./src/routes/genres');
const searchRouter = require('./src/routes/search');
const cartRouter = require('./src/routes/cart');
const bookingsRouter = require('./src/routes/bookings');
const paymentsRouter = require('./src/routes/payments');
const ordersRouter = require('./src/routes/orders');
const refundsRouter = require('./src/routes/refunds');
const promotionsRouter = require('./src/routes/promotions');
const devRouter = require('./src/routes/dev');
const authRouter = require('./src/routes/authRoutes');
const profileRouter = require('./src/routes/profile');
const adminRoutes = require("./src/routes/admin.routes");

// IMPORTANT: Search must be BEFORE events to avoid /api/events/:id collision (where :id="search")
app.use('/api/events/search', searchRouter);
app.use('/api/events', eventsRouter);
app.use('/api/genres', genresRouter);
app.use('/api/cart', cartRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/refunds', refundsRouter);
app.use('/api/promotions', promotionsRouter);
app.use('/api/dev', devRouter);
app.use('/api/auth', authRouter);
app.use('/api/profile', profileRouter);

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
app.use("/admin", adminRoutes);

/* ---------------- Swagger ---------------- */
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "My API",
      version: "1.0.0",
    },
  },
  apis: ["./index.js", "./src/routes/*.js"],
};

const specs = swaggerJsdoc(swaggerOptions);
app.use("/api.html", swaggerUi.serve, swaggerUi.setup(specs));


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
