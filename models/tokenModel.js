const mongoose = require("mongoose");

const TokenSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
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
    },
    max_activation_count: {
        type: Number,
        default: 1
    },
    disable: {
        type: Boolean,
        default: false
    }
});

TokenSchema.index({ user_id: 1 });
TokenSchema.index({ user_id: 1, device: 1 });

const Token = mongoose.model('Token', TokenSchema);

module.exports = Token;
