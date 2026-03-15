const express = require('express');
const router = express.Router();
const devController = require('../controllers/devController');

router.post('/seed-test-events', devController.seedTestData);

module.exports = router;
