const mongoose = require("mongoose");

const AvatarSchema = new mongoose.Schema({
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
    },
    defaultAsset: {
        type: Boolean,
        required: false,
        default: false
    }
});

const Avatar= mongoose.model('Avatar', AvatarSchema, 'avatars');

module.exports = Avatar;