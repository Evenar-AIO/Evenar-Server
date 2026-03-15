require("dotenv").config();
const dns = require("dns");

// Increase threadpool for better network performance
process.env.UV_THREADPOOL_SIZE = 64;

// Fix for Node.js 18+ DNS resolution issues on some networks (especially IPv6/NAT64)
// This forces IPv4 first to avoid AggregateError [ETIMEDOUT] when connecting to Cloudinary
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder("ipv4first");
}

// Global error handlers to prevent silent crashes and improve logging
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const pinoHttp = require("pino-http");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");

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
const path = require("path");
app.use(pinoHttp());
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "img-src": ["'self'", "data:", "https://res.cloudinary.com", "https://avatar.vercel.sh", "http://localhost:*", "http://127.0.0.1:*"],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
}));
app.use(cors());
app.use(compression());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const { apiLimiter } = require("./src/middleware/rateLimit.middleware");
app.use(apiLimiter);

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
const uploadRouter = require('./src/routes/upload');
const profileRouter = require('./src/routes/profile');
const organizerRouter = require('./src/routes/organizerRoutes');
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
app.use('/api/upload', uploadRouter);
app.use('/api/test-upload', require('./src/routes/test-upload'));
app.use('/api/organizer', organizerRouter);

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
app.use("/api/admin", adminRoutes);

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
