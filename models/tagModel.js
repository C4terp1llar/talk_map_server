const mongoose = require("mongoose");

const TagSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    emoji: {
        type: String,
        required: true,
    },
    text: {
        type: String,
        unique: true,
        required: true,
    }
});

const Tag = mongoose.model('Tag', TagSchema);

module.exports = Tag;