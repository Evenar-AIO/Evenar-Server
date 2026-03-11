const searchService = require('../services/searchService');

exports.searchEvents = async (req, res) => {
  try {
    const result = await searchService.searchEvents(req.query);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
