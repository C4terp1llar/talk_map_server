const mongoose = require("mongoose");

const PhotoSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    media_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Media',
        required: true,
    },
    url: {
        type: String,
        required: true,
    }
});

const Photo = mongoose.model('Photo', PhotoSchema);

module.exports = Photo;
