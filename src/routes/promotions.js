const express = require('express');
const router = express.Router();
const promotionController = require('../controllers/promotionController');
const { validatePromotionRequest } = require('../validators/promotionValidator');

router.post('/validate', validatePromotionRequest, promotionController.validateCode);

module.exports = router;
