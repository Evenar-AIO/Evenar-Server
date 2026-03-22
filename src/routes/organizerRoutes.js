const express = require('express');
const router = express.Router();
const { submitRequest, getMyRequest } = require('../controllers/organizerController');
const { actionLimiter } = require('../middleware/rateLimitMiddleware');
const { verifyToken } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.post('/request', actionLimiter, submitRequest);
router.get('/my-request', getMyRequest);

module.exports = router;
