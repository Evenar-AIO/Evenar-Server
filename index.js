const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const pinoHttp = require("pino-http");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");

require("dotenv").config();
const connectDB = require("./src/config/db");

// Connect to Database
connectDB();

const app = express();

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
