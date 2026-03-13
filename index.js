const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const pinoHttp = require("pino-http");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");

require("dotenv").config();

const mongoose = require("mongoose");
require("dotenv").config();

const app = express();

/* ---------------- Database ---------------- */
const mongoURI = process.env.MONGODB_URI || "mongodb://localhost:27017/combos";

// Enable MongoDB driver sessions for transactions
mongoose.connect(mongoURI, {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
  .then(() => console.log("✅ connected to MongoDB:", mongoURI))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

/* ---------------- Middleware ---------------- */
app.use(pinoHttp());
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100, // use "max" instead of "limit" (newer versions)
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

/* ---------------- Routes ---------------- */
const eventsRouter = require('./src/routes/events');
const searchRouter = require('./src/routes/search');
const cartRouter = require('./src/routes/cart');
const bookingsRouter = require('./src/routes/bookings');
const paymentsRouter = require('./src/routes/payments');
const ordersRouter = require('./src/routes/orders');
const refundsRouter = require('./src/routes/refunds');
const promotionsRouter = require('./src/routes/promotions');
const devRouter = require('./src/routes/dev');

// IMPORTANT: Search must be BEFORE events to avoid /api/events/:id collision (where :id="search")
app.use('/api/events/search', searchRouter);
app.use('/api/events', eventsRouter);
app.use('/api/cart', cartRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/refunds', refundsRouter);
app.use('/api/promotions', promotionsRouter);
app.use('/api/dev', devRouter);

app.get("/", (req, res) => {
  res.status(200).send("Hello World");
});

app.get("/health", (req, res) => {
  res.status(200).json({ ok: true });
});

/* ---------------- Swagger ---------------- */
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "My API",
      version: "1.0.0",
    },
  },
  apis: ["./index.js", "./routes/*.js"],
};
/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check
 *     responses:
 *       200:
 *         description: Server is healthy
 */

const specs = swaggerJsdoc(swaggerOptions);
app.use("/api.html", swaggerUi.serve, swaggerUi.setup(specs));

/* ---------------- Server ---------------- */
const port = Number(process.env.PORT) || 3000;

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

module.exports = { app };
