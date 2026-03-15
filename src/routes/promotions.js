const express = require('express');
const router = express.Router();
const promotionController = require('../controllers/promotionController');

router.post('/validate', promotionController.validateCode);

module.exports = router;
