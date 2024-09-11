const mongoose = require("mongoose");

const commonAvatarSchema  = new mongoose.Schema({
    img_url: {
        type: String,
        required: true
    }
});

const commonAvatar= mongoose.model('commonAvatar', commonAvatarSchema, 'commonAvatars');

module.exports = commonAvatar;