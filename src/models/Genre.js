const mongoose = require('mongoose');

const genreSchema = new mongoose.Schema(
    {
        legacyId: { type: Number },
        genreName: {
            type: String,
            required: [true, 'Please add a genre name'],
            trim: true
        },
        description: {
            type: String
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('Genre', genreSchema, 'genres');
