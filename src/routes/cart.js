const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');

// const auth = require('../middleware/auth'); // assuming auth exists or mocked

router.post('/cart', cartController.addToCart);

module.exports = router;
