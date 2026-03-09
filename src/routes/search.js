const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');

router.get('/events/search', searchController.searchEvents);

module.exports = router;
