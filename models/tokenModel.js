const mongoose = require("mongoose");

const TokenSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    token: {
        type: String,
        required: true
    },
    device: {
        type: String,
        required: true
    },
    created: {
        type: Date,
        default: Date.now
    }
});

const Token= mongoose.model('Token', TokenSchema);

module.exports = Token;