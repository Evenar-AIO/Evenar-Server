const Genre = require('../models/Genre');

exports.getGenres = async (req, res) => {
  try {
    const genres = await Genre.find();
    res.json(genres);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
