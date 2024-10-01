const mongoose = require("mongoose");

const originalAvatarSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    public_id: {
        type: String,
        required: true
    },
    asset_id: {
        type: String,
        required: true
    },
    asset_url: {
        type: String,
        required: true
    },
    path: {
        type: String,
        required: true
    }
});

const originalAvatar= mongoose.model('originalAvatar', originalAvatarSchema, 'originalAvatars');

module.exports = originalAvatar;