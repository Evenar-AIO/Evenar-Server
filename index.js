const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const pinoHttp = require('pino-http');

require('dotenv').config();

const { connectDB } = require('./src/config/database');
const eventRoutes = require('./src/routes/eventRoutes');
const profileRoutes = require('./src/routes/profileRoutes');
const errorHandler = require('./src/middleware/errorHandler');

const app = express();

// connect MongoDB
connectDB();

app.use(pinoHttp());
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 1000,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.get('/', (req, res) => {
  res.status(200).send('Hello World');
});

app.get('/health', (req, res) => {
  res.status(200).json({ ok: true });
});

app.use('/events', eventRoutes);
app.use('/', profileRoutes);

app.use(errorHandler);

const port = Number(process.env.PORT) || 3000;

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

module.exports = { app };